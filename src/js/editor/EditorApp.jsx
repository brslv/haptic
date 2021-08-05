import React, {
  useRef,
  useState,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import { hasChosenProduct } from "./utils";
import Select from "react-select";
import { useImageUpload } from "./ImageUpload/ImageUploadProvider";
import QuickUpdateTool from "./QuickUpdateTool";
import Title from "./Title";
import { toast, turbo } from "./utils";

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
    case "quick_update_change":
      return {
        ...state,
        quickUpdateText: action.payload,
      };
    case "publishing":
      return {
        ...state,
        publishing: action.payload,
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
  quickUpdateText: "",
  publishing: false,
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

  const onQuickUpdateChange = ({ target }) =>
    dispatch({ type: "quick_update_change", payload: target.value });

  const onCloseFailMessage = () => {
    imageUpload.clearFailed();
  };

  const onQuickUpdateSubmit = () => {
    dispatch({ type: "publishing", payload: true });
    const text = state.quickUpdateText;
    const images = imageUpload.state.imageInfos.map((i) => i.url);
    const productId = state.chosenProduct;
    const product = outerState.find(
      (product) => product.id === state.chosenProduct
    );
    const csrf = document
      .querySelector('meta[name="csrf"]')
      .getAttribute("content");

    const url = `/post/${productId}/text`;

    axios
      .post(url, {
        text,
        images,
        productId,
        csrf,
      })
      .then((response) => {
        toast({
          type: "success",
          content: "Update published successsfully",
        });

        dispatch({ type: "publishing", payload: false });
        if (!product) return;
        const postId = response.data.details.post.id;
        if (postId) {
          turbo.actions.visit(`/p/${product.slug}/${postId}`);
        } else {
          turbo.actions.visit(`/`);
        }
      })
      .catch((err) => {
        dispatch({ type: "publishing", payload: false });
        const message = err.response.data.err;
        toast({ type: "error", content: message });
      });
  };

  const onImageRemove = (image) => imageUpload.removeImage(image);

  return (
    <div>
      <div className="mb-4 uppercase text-xs font-medium">
        <Title className="inline-block">Publish in</Title>
        {/*<span className="mr-2 md:mx-2">
          <Select
            className="inline-block w-32"
            classNamePrefix="hpt-select"
            options={toolsOptions}
            value={toolsOptions.find((o) => o.value === state.selectedTool)}
            onChange={(option) => onToolChange(option.value)}
            styles={selectStyles}
          />
        </span>*/}
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
          onChange={onQuickUpdateChange}
          onSubmit={onQuickUpdateSubmit}
          text={state.quickUpdateText}
          disabled={state.publishing}
          onCloseFailMessage={onCloseFailMessage}
        />
      ) : null}
    </div>
  );
}
