import React, { useState, useReducer, useEffect, useCallback } from "react";
import ContentEditable from "react-contenteditable";
import { hasChosenProduct } from "./utils";

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

const App = () => {
  const [outerState, setOuterState] = useState(window.state);
  const [state, dispatch] = useReducer(reducer, initialState);

  const onProductChange = useCallback(
    (id) => {
      dispatch({ type: "choose_product", payload: id });
    },
    [dispatch]
  );

  const onContentToolSelected = (tool) => {
    document.body.classList.add("overflow-hidden");
    dispatch({ type: "select_tool", payload: tool });
  };

  const onToolClose = () => {
    document.body.classList.remove("overflow-hidden");
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
    <div>
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
        {hasChosenProduct(state.chosenProduct) ? (
          <ContentToolPicker onSelect={onContentToolSelected} />
        ) : null}
      </div>

      {state.selectedTool === TOOLS.QUICK_UPDATE ? (
        <QuickUpdateTool onClose={onToolClose} />
      ) : null}
    </div>
  );
};

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
    <div className="flex items-start">
      <ContentToolBtn
        iconName="file-text"
        title="Quick Update"
        description="Perfect for simple updates, announcements, or quick thoughts"
        onClick={() => onClick(TOOLS.QUICK_UPDATE)}
      />
      <ContentToolBtn
        iconName="bar-chart-2"
        title="Poll"
        description="Ask a question and get quick feedback"
        onClick={() => onClick(TOOLS.POLL)}
      />
    </div>
  );
}

function ContentToolBtn({ iconName, title, description, onClick }) {
  const cn =
    "click-scale flex-1 btn bg-white text-left flex items-start font-medium border border-gray-200 p-4 rounded-md hover:ring-2 hover:ring-gray-200 hover:ring-offset-2 transition mr-2";
  return (
    <button className={cn} onClick={onClick}>
      <Icon
        name={iconName}
        className="mr-4"
        width={32}
        height={32}
        strokeWidth={1}
      />
      <span className="flex flex-col flex-start justify-start">
        <span className="text-lg">{title}</span>
        <span className="text-gray-600">{description}</span>
      </span>
    </button>
  );
}

function QuickUpdateTool({ onClose }) {
  return (
    <React.Fragment>
      <div
        className="fixed top-0 left-0 w-screen h-screen bg-white bg-opacity-50 bg-clip-padding"
        style={{ backdropFilter: "blur(20px)" }}
      />
      <div
        className="shadow-xl fixed bottom-0 left-1/2 w-full bg-white mx-auto rounded-tl-xl rounded-tr-xl border border-gray-200 p-8 text-lg"
        style={{
          maxWidth: 960,
          width: "95%",
          height: "98%",
          transform: "translateX(-50%)",
        }}
      >
        <div className="absolute top-4 right-4">
          <button
            className="btn p-2 rounded-full bg-gray-50 click-scale-2"
            onClick={onClose}
          >
            <Icon name="x" width="16" height="16" />
          </button>
        </div>

        <div
          className="mb-8 max-w-md mx-auto overflow-hidden"
          style={{ height: "98%" }}
        >
          <div
            className="overflow-y-scroll"
            style={{
              boxSizing: "content-box",
              height: "100%",
              width: "100%",
              paddingRight: 17,
            }}
          >
            <textarea
              style={{ height: "100%", width: "100%", marginRight: -17 }}
              className="outline-none resize-none quick-update-container"
            />
          </div>
        </div>
      </div>
    </React.Fragment>
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

export default App;
