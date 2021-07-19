import React, {
  useRef,
  useState,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import ContentEditable from "react-contenteditable";
import { hasChosenProduct } from "./utils";
import TextareaAutosize from "react-textarea-autosize";
import Select from "react-select";

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

  return (
    <div className="lg:w-2/3">
      <div className="block text-xs uppercase text-gray-600 font-medium mb-4">
        <span class="block mb-2 md:inline-block md:mb-0">Publish</span>
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
        <span> in </span>
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
        <QuickUpdateTool />
      ) : null}
    </div>
  );
}

function QuickUpdateTool() {
  const ref = useRef(null);
  useEffect(() => {
    if (ref && ref.current) {
      ref.current.focus();
    }
  }, [ref.current]);

  return (
    <div className="relative">
      <TextareaAutosize
        autoFocus
        minRows={3}
        placeholder="Start typing..."
        className="text-lg outline-none resize-none w-full focus:ring-2 focus:ring-yellow-300 bg-white border border-gray-200 focus:border-none p-4 rounded-md transition"
      />
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
