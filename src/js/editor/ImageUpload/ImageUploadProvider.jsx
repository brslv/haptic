import React, { createContext, useContext, useState, useEffect } from "react";
import UploadService from "./UploadService";
import { toast } from "../utils";

const ImageUploadContext = createContext(null);

function generateId() {
  return (
    "_" +
    Math.random()
      .toString(36)
      .substr(2, 9)
  );
}

export default function ImageUploadProvider({ children }) {
  const [state, setState] = useState({
    selectedFiles: null,
    previewImages: [],
    progressInfos: [],
    statusses: [],
    imageInfos: [],
    flags: {
      progressInfosInitialized: false,
    },
  });

  function populateImages(images) {
    const _images = images.map((i) => ({ id: i.image_id, url: i.image_url }));
    setState((prev) => ({
      ...prev,
      previewImages: [...state.previewImages, ..._images],
      progressInfos: [
        ...state.progressInfos,
        ..._images.map((i) => ({ id: i.id, percentage: 100, file: null })),
      ],
      statusses: [
        ...state.statusses,
        ..._images.map((i) => ({ id: i.id, ok: true, file: null, err: null })),
      ],
      imageInfos: [...state.imageInfos, ..._images],
    }));
  }

  function selectFiles(event) {
    let images = [];
    const targetFiles = [...event.target.files];
    const tooManyImages = () => {
      toast({ type: "error", content: "You can upload up to 5 files" });
    };

    const currImgCount = state.imageInfos.length;
    const toBeUplCount = targetFiles.length;
    const freeSlots = 5 - currImgCount;
    const pickCount = freeSlots > toBeUplCount ? toBeUplCount : freeSlots;

    if (freeSlots === 0) return tooManyImages(); // don't upload
    if (freeSlots < toBeUplCount) tooManyImages(); // upload the pickCount, but show that the limit is 5

    const files = targetFiles.slice(0, pickCount).map((fileData) => ({
      id: generateId(),
      fileData,
    }));

    for (let i = 0; i < files.length; i++) {
      const currFile = files[i];
      images.push({
        id: currFile.id,
        url: URL.createObjectURL(currFile.fileData),
      });
    }

    setState((prev) => ({
      ...prev,
      selectedFiles: files,
      previewImages: [...prev.previewImages, ...images],
    }));
  }

  useEffect(() => {
    if (state.selectedFiles && state.selectedFiles.length) {
      initializeProgressInfos();
    }
  }, [state.selectedFiles]);

  function initializeProgressInfos() {
    const selectedFiles = state.selectedFiles;
    let _progressInfos = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const currFile = selectedFiles[i];
      _progressInfos.push({ id: currFile.id, percentage: 0, file: currFile });
    }

    setState((prev) => ({
      ...prev,
      progressInfos: [...prev.progressInfos, ..._progressInfos],
      statusses: [],
      flags: {
        ...prev.flags,
        progressInfosInitialized: true,
      },
    }));
  }

  useEffect(() => {
    if (state.flags.progressInfosInitialized) uploadImages();
  }, [state.flags.progressInfosInitialized]);

  function uploadImages() {
    if (!state.selectedFiles) return;
    if (!state.progressInfos.length) throw new Error("Progress infos missing.");

    const selectedFiles = state.selectedFiles;
    let uploadSingleImagePromises = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const currFile = selectedFiles[i];
      uploadSingleImagePromises.push(uploadSingleImage(currFile));
    }

    Promise.all(uploadSingleImagePromises).then(() => {
      setState((prev) => ({
        ...prev,
        selectedFiles: [],
        flags: {
          ...prev.flags,
          progressInfosInitialized: false,
        },
      }));
    });
  }

  function uploadSingleImage(file) {
    let _progressInfos = [...state.progressInfos];
    const progressInfoObj = Object.values(_progressInfos).find(
      (pi) => pi.id === file.id
    );

    return UploadService.upload(file.fileData, (event) => {
      progressInfoObj.percentage = Math.round(
        (100 * event.loaded) / event.total
      );
      setState((prev) => ({
        ...prev,
        progressInfos: _progressInfos,
      }));
    })
      .then((response) => {
        setState((prev) => {
          let nextStatusses = [
            ...prev.statusses,
            { id: file.id, ok: true, file, err: null },
          ];
          return {
            ...prev,
            statusses: nextStatusses,
            imageInfos: [
              ...prev.imageInfos,
              { id: file.id, ...response.data.details },
            ],
          };
        });
      })
      .catch((err) => {
        progressInfoObj.percentage = 0;
        setState((prev) => {
          let nextStatusses = [
            ...prev.statusses,
            { id: file.id, ok: false, file, err: err.response.data.err },
          ];
          return {
            ...prev,
            progressInfos: _progressInfos,
            statusses: nextStatusses,
          };
        });
      });
  }

  function removeImage(image) {
    setState((prev) => {
      const newImageInfos = prev.imageInfos.filter((file) => {
        return file.id !== image.id;
      });
      const newPreviewImages = prev.previewImages.filter(
        (i) => i.id !== image.id
      );
      const newProgressInfos = prev.progressInfos.filter(
        (i) => i.id !== image.id
      );
      const newStatusses = prev.statusses.filter((i) => i.id !== image.id);

      const newState = {
        ...prev,
        flags: {
          ...prev.flags,
          progressInfosInitialized: false,
        },
        selectedFiles: null,
        imageInfos: newImageInfos,
        previewImages: newPreviewImages,
        progressInfos: newProgressInfos,
        statusses: newStatusses,
      };

      return newState;
    });
  }

  function clearFailed() {
    setState((prev) => {
      const failedIds = prev.statusses.filter((s) => s.err).map((f) => f.id);
      return {
        ...prev,
        imageInfos: prev.imageInfos.filter((i) => !failedIds.includes(i.id)),
        previewImages: prev.previewImages.filter(
          (i) => !failedIds.includes(i.id)
        ),
        progressInfos: prev.progressInfos.filter(
          (i) => !failedIds.includes(i.id)
        ),
        statusses: prev.statusses.filter((i) => !failedIds.includes(i.id)),
      };
    });
  }

  const value = {
    state,
    selectFiles,
    removeImage,
    clearFailed,
    populateImages,
  };

  return (
    <ImageUploadContext.Provider value={value}>
      {children}
    </ImageUploadContext.Provider>
  );
}

export function useImageUpload() {
  const ctx = useContext(ImageUploadContext);
  if (ctx === null) throw new Error("Improper use of ImageUploadContext");
  return ctx;
}
