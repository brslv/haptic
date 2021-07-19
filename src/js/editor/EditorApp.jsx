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

const TOOLS = {
  QUICK_UPDATE: "quick_update",
  POLL: "poll",
};

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

const initialState = {
  chosenProduct: "1",
  selectedTool: null,
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

  const onContentToolSelected = (tool) => {
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

  return (
    <div className="lg:w-2/3">
      <div className="mb-4 flex items-center">
        <div className="mr-4">
          <div className="block text-xs uppercase text-gray-600 font-medium">
            Publishing in:
          </div>
        </div>

        {/* Product picker */}
        <ProductPicker
          chosenProduct={state.chosenProduct}
          products={outerState}
          onChange={onProductChange}
        />
      </div>

      <div className="mb-4">
        {hasChosenProduct(state.chosenProduct) && !state.selectedTool ? (
          <ContentToolPicker onSelect={onContentToolSelected} />
        ) : null}
      </div>

      {state.selectedTool === TOOLS.QUICK_UPDATE ? (
        <QuickUpdateTool onClose={onToolClose} />
      ) : null}
    </div>
  );
}

function ProductPicker({ chosenProduct, products, onChange }) {
  const onChooseProduct = (e) => {
    const productId = e.target.value;
    onChange(productId);
  };

  return (
    <div>
      <select
        value={hasChosenProduct(chosenProduct) ? chosenProduct : "_"}
        onChange={onChooseProduct}
        className="input cursor-pointer transition"
      >
        <option value="_">Pick a product to publish update</option>
        {products.map((product) => {
          return (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function ContentToolPicker({ onSelect }) {
  const onClick = (type) => {
    onSelect(type);
  };

  return (
    <div className="flex items-start flex-col md:flex-row">
      <div className="mb-2 md:mr-2 md:mb-0 flex-1 w-full">
        <ContentToolBtn
          iconName="file-text"
          title="Quick Update"
          description="Perfect for simple updates, announcements, or quick thoughts"
          onClick={() => onClick(TOOLS.QUICK_UPDATE)}
        />
      </div>
      <div className="mb-2 md:mr-2 md:mb-0 flex-1 w-full">
        <ContentToolBtn
          iconName="bar-chart-2"
          title="Poll"
          description="Ask a question and get quick feedback"
          onClick={() => onClick(TOOLS.POLL)}
        />
      </div>
    </div>
  );
}

function ContentToolBtn({ iconName, title, description, onClick }) {
  const cn =
    "click-scale w-full btn bg-white text-left flex items-start font-medium border border-gray-200 p-4 rounded-md hover:ring-2 hover:ring-gray-200 hover:ring-offset-2 transition";
  return (
    <button className={cn} onClick={onClick}>
      <Icon
        name={iconName}
        width={32}
        height={32}
        strokeWidth={1}
        className="mr-4"
      />
      <span className="flex flex-col flex-start justify-start">
        <span className="text-lg">{title}</span>
        <span className="text-gray-600">{description}</span>
      </span>
    </button>
  );
}

function QuickUpdateTool({ onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref && ref.current) {
      ref.current.focus();
    }
  }, [ref.current]);

  useEffect(() => {
    function onKeyUp(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keyup", onKeyUp);
    return () => window.removeEventListener("keyup", onKeyUp);
  });

  return (
    <div className="relative bg-white border border-gray-200 p-4 rounded-md">
      <TextareaAutosize
        autoFocus
        placeholder="Start typing..."
        className="text-lg quick-update-textarea outline-none resize-none w-full"
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
