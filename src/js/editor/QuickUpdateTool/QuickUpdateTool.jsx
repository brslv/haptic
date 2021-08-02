import React, { useRef, useState, useEffect } from 'react';
import TextareaAutosize from "react-textarea-autosize";
import { mdConverter } from "../utils";
import { QuickUpdatePreview } from './QuickUpdatePreview';
import Icon from '../Icon';

export default function QuickUpdateTool({
  imagesState,
  onImagesUpload,
  onImageRemove,
  onChange,
  onSubmit,
  text,
}) {
  const ref = useRef(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  useEffect(() => {
    if (ref && ref.current) {
      ref.current.focus();
    }
  }, [ref.current]);

  const focusOnEditor = (e) => {
    if (ref && ref.current) ref.current.focus();
  };

  const imageUploadBtnRef = useRef(null);
  function onImageUploadBtnClick() {
    imageUploadBtnRef &&
      imageUploadBtnRef.current &&
      imageUploadBtnRef.current.click();
  }

  const onPreview = () => setIsPreviewing((prev) => !prev);

  const imagesLength = imagesState.previewImages.length;
  const IMG_HEIGHT_ON_MULTIPLE_IMAGES = 180;
  const IMG_HEIGHT_SINGLE_IMAGE = 350;
  const IMG_MIN_WIDTH_ON_MULTIPLE_IMAGES = 140;
  const IMG_MIN_WIDTH_SINGLE_IMAGE = "100%";

  return (
    <div
      className="relative border border-gray-200 rounded-md mb-20 sm:mb-0"
      onClick={focusOnEditor}
    >
      <form className="hidden">
        <input
          ref={imageUploadBtnRef}
          type="file"
          multiple
          accept="image/*"
          onChange={onImagesUpload}
          className="hidden"
        />
      </form>
      <div className="max-w-md mx-auto" style={{ minHeight: `100px` }}>
        {imagesState.previewImages && imagesState.previewImages.length ? (
          <div className="flex flex-wrap items-start mx-2 mt-10">
            {imagesState.previewImages.map((image) => {
              const progress = imagesState.progressInfos.find(
                (p) => p.id === image.id
              ) || { percentage: 0 };
              const status = imagesState.statusses.find(
                (s) => s.id === image.id
              ) || { ok: true };

              return (
                // image preview
                <div
                  key={image.url}
                  style={{
                    height:
                      imagesLength > 1
                        ? IMG_HEIGHT_ON_MULTIPLE_IMAGES
                        : IMG_HEIGHT_SINGLE_IMAGE,
                    minWidth:
                      imagesLength > 1
                        ? IMG_MIN_WIDTH_ON_MULTIPLE_IMAGES
                        : IMG_MIN_WIDTH_SINGLE_IMAGE,
                  }}
                  className={`relative flex flex-1 border ${
                    !status.ok ? "border-red-500" : "border-gray-200"
                  } rounded-md m-2 p-1 h-full justify-center items-center overflow bg-transparent`}
                >
                  <div className="flex items-center justify-center overflow-hidden relative rounded-md max-h-full">
                    <img
                      src={image.url}
                      data-zoomable
                      alt={`Uploaded image by user`}
                      className={`flex-shrink-0 min-w-full min-h-full ${
                        progress.percentage < 100 && status.ok
                          ? "animate animate-pulse"
                          : ""
                      }`}
                    />
                  </div>
                  {!status.ok ? (
                    <div className="absolute bottom-0 left-0 w-full p-1">
                      <div className="bg-red-50 border border-red-200 p-1 rounded-md text-xs">
                        {status.err}
                      </div>
                    </div>
                  ) : null}
                  {progress.percentage < 100 && status.ok ? (
                    <div className="absolute bottom-0 left-0 w-full">
                      <div
                        style={{ height: 2 }}
                        className="relative bg-transparent w-full"
                      >
                        <div
                          className="h-full bg-green-500 rounded-md"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                  {!isPreviewing ? (
                    <button
                      onClick={() => onImageRemove(image)}
                      className="absolute top-2 left-2 click-scale-2 focus:outline-none flex items-center justify-center rounded-full w-6 h-6 bg-gray-50 border border-gray-200 hover:bg-red-50 hover:border-red-200 transition"
                    >
                      <Icon name="x" width={12} height={12} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="px-4 pt-8 pb-16 w-full">
          {!isPreviewing ? (
            <TextareaAutosize
              minRows={2}
              value={text}
              onChange={onChange}
              className="outline-none border-none w-full textarea focus:ring-0"
              autoFocus
            />
          ) : (
            <QuickUpdatePreview content={mdConverter.makeHtml(text)} />
          )}
        </div>
      </div>
      <div
        className="px-2 py-1.5 rounded-xl flex items-center justify-center absolute -bottom-10 left-1/2 bg-white border border-gray-200"
        style={{ transform: "translateX(-50%)" }}
      >
        <button onClick={onSubmit} className="focus:ring-2 ring-yellow-300 btn mr-2 flex items-center justify-center flex-col transition bg-yellow-50 hover:bg-yellow-300 rounded-xl">
          <Icon name="plus" width={18} height={18} className="mb-0.5" />
          <span>Publish</span>
        </button>
        <div className="flex items-center">
          <button
            onClick={onImageUploadBtnClick}
            className="btn flex flex-col items-center justify-center mr-2 transition hover:bg-gray-50 whitespace-nowrap rounded-xl"
          >
            <Icon name="image" width={18} height={18} className="mb-0.5" />
            <span>Upload image</span>
          </button>
          <button
            onClick={onPreview}
            className="btn flex flex-col items-center justify-center transition hover:bg-gray-50 whitespace-nowrap rounded-xl"
          >
            <Icon
              name={isPreviewing ? "eye-off" : "eye"}
              width={18}
              height={18}
              className="mb-0.5"
            />
            <span>{isPreviewing ? "Edit" : "Preview"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}