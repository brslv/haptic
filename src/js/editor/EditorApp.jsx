import React, {
  useRef,
  useState,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import { hasChosenProduct } from "./utils";
import ContentEditable from "react-contenteditable";
import Select from "react-select";
import { useImageUpload } from "./ImageUpload/ImageUploadProvider";

const TOOLS = {
  QUICK_UPDATE: "quick_update",
  POLL: "poll",
};

const toolsOptions = [
  { value: TOOLS.QUICK_UPDATE, label: "Quick Update" },
  { value: TOOLS.POLL, label: "Poll" },
];

function reducer(state, action) {
  switch (action.type) {
    case "choose_product":
      return {
        ...state,
        chosenProduct: action.payload,
      };
    case "select_tool":
      return {
        ...state,
        selectedTool: action.payload,
      };
    default:
      throw new Error(`Invalid action type: ${action.type}`);
  }
}

const selectStyles = {
  indicatorSeparator: (styles) => ({ ...styles, display: "none" }),
};

const initialState = {
  chosenProduct: null,
  selectedTool: TOOLS.QUICK_UPDATE,
};

export default function EditorApp() {
  const [outerState, setOuterState] = useState(window.state);
  const [state, dispatch] = useReducer(reducer, initialState);
  const imageUpload = useImageUpload();

  const onProductChange = useCallback(
    (id) => {
      dispatch({ type: "choose_product", payload: id });
    },
    [dispatch]
  );

  const onToolChange = (tool) => {
    dispatch({ type: "select_tool", payload: tool });
  };

  const onToolClose = () => {
    dispatch({ type: "select_tool", payload: null });
  };

  // Set the chosen product to the first one
  useEffect(() => {
    if (outerState && outerState.length && outerState[0].id) {
      onProductChange(outerState[0].id);
    }
  }, [outerState, onProductChange]);

  useEffect(() => console.log({ state }), [state]);

  const productOptions = outerState.map((product) => ({
    value: product.id,
    label: product.name,
  }));

  const onImagesUpload = (e) => {
    imageUpload.selectFiles(e);
  };

  const onImageRemove = (image) => imageUpload.removeImage(image);

  return (
    <div>
      <div className="mb-4 uppercase text-xs font-medium">
        <Title className="block md:inline-block">Publish</Title>
        <span className="mr-2 md:mx-2">
          <Select
            className="inline-block w-32"
            classNamePrefix="hpt-select"
            options={toolsOptions}
            value={toolsOptions.find((o) => o.value === state.selectedTool)}
            onChange={(option) => onToolChange(option.value)}
            styles={selectStyles}
          />
        </span>
        <Title> in </Title>
        <span className="mx-2">
          <Select
            className="inline-block w-32"
            classNamePrefix="hpt-select"
            options={productOptions}
            value={productOptions.find(
              (productOption) => +productOption.value === +state.chosenProduct
            )}
            onChange={(option) => onProductChange(option.value)}
            styles={selectStyles}
          />
        </span>
      </div>

      {state.chosenProduct && state.selectedTool === TOOLS.QUICK_UPDATE ? (
        <QuickUpdateTool
          imagesState={imageUpload.state}
          onImagesUpload={onImagesUpload}
          onImageRemove={onImageRemove}
        />
      ) : null}
    </div>
  );
}

function Title({ children, className, ...rest }) {
  return (
    <span
      className={`text-xs uppercase text-gray-600 font-medium mb-2 md:mb-0 ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}

function QuickUpdateTool({ imagesState, onImagesUpload, onImageRemove }) {
  const ref = useRef(null);
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

  const imagesLength = imagesState.previewImages.length;
  const IMG_HEIGHT_ON_MULTIPLE_IMAGES = 180;
  const IMG_HEIGHT_SINGLE_IMAGE = 350;
  const IMG_MIN_WIDTH_ON_MULTIPLE_IMAGES = 140;
  const IMG_MIN_WIDTH_SINGLE_IMAGE = "100%";

  return (
    <div
      className="relative border border-gray-200 rounded-md"
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
                      className={`flex-shrink-0 min-w-full min-h-full cursor-pointer ${
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
                  <button
                    onClick={() => onImageRemove(image)}
                    className="absolute top-2 left-2 click-scale-2 focus:outline-none flex items-center justify-center rounded-full w-6 h-6 bg-gray-50 border border-gray-200 hover:bg-red-50 hover:border-red-200 transition"
                  >
                    <Icon name="x" width={12} height={12} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}

        <ContentEditable
          innerRef={ref}
          autoFocus
          html={""}
          disabled={false}
          className="outline-none px-4 pt-8 pb-16"
        />
      </div>
      <div
        className="px-2 py-1.5 rounded-xl flex items-center justify-center absolute -bottom-10 left-1/2 bg-white border border-gray-200"
        style={{ transform: "translateX(-50%)" }}
      >
        <button className="focus:ring-2 ring-yellow-300 btn mr-2 flex items-center justify-center flex-col transition bg-yellow-50 hover:bg-yellow-300 rounded-xl">
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
          <button className="btn flex flex-col items-center justify-center transition hover:bg-gray-50 whitespace-nowrap rounded-xl">
            <Icon name="eye" width={18} height={18} className="mb-0.5" />
            <span>Preview</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Icon(
  {
    name,
    width = "24",
    height = "24",
    fill = "none",
    stroke = "default",
    strokeWidth = "2",
    active = false,
    ...rest
  } = {
    name: "plus",
    width: "24",
    height: "24",
    fill: "none",
    stroke: "default",
    strokeWidth: "2",
    active: false,
  }
) {
  const colors = {
    disabled: "#D1D5DB",
    white: "white",
    black: "black",
    muted: "#6B7280",
    faded: "#9CA3AF",
    default: "black",
    primary: "#FCD34D",
    primaryDark: "#FBBF24",
    danger: "#EF4444",
    twitter: "#1DA1F2",
  };

  return (
    <svg
      width={width}
      height={height}
      fill={colors[fill] ? colors[fill] : "none"}
      stroke={`${active ? colors.primary : colors[stroke] || colors.default}`}
      strokeWidth={`${strokeWidth}`}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <use xlinkHref={`/static/images/icons/feather-sprite.svg#${name}`} />
    </svg>
  );
}
