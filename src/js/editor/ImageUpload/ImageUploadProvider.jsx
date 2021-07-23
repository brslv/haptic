import React, { createContext, useContext, useState, useEffect } from "react";
import UploadService from "./UploadService";

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

  function selectFiles(event) {
    let images = [];

    const files = [...event.target.files].map((fileData, idx) => ({
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
      document.dispatchEvent(new CustomEvent("hpt:init-zoomable"));
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

      console.log({ newState });

      return newState;
    });
  }

  useEffect(() => {
    console.log(state);
  }, [state]);

  const value = {
    state,
    selectFiles,
    removeImage,
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
