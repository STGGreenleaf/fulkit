const GRAY = "#8a8784";

const css = `
  @keyframes rock {
    0%, 100% { transform: rotate(0deg); }
    20% { transform: rotate(-5deg); }
    40% { transform: rotate(5deg); }
    60% { transform: rotate(-3deg); }
    80% { transform: rotate(2deg); }
  }
  @keyframes wink {
    0%, 68%, 80%, 100% { transform: scaleY(1); }
    72%, 76% { transform: scaleY(0.05); }
  }
  .rock-body {
    animation: rock 1.8s ease-in-out infinite;
    transform-origin: 360px 360px;
  }
  .wink-right {
    animation: wink 3.6s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: center center;
  }
`;

export default function RockWink() {
  return (
    <div style={{
      width: "100%",
      height: "100vh",
      minHeight: 500,
      background: "#F5F0E8",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <style>{css}</style>
      <svg viewBox="0 0 720 720" width={80} height={80} style={{ overflow: "visible" }}>
        <g className="rock-body">
          <circle cx="360" cy="360" r="335.4" fill="#fff" stroke={GRAY} strokeMiterlimit="10" strokeWidth="40" />
          <path
            fill={GRAY}
            d="M237.1,548.38c-11.5-19.17-17.25-41.58-17.25-67.25v-221h65.5v219c0,23.33,6.33,41.17,19,53.5s30.83,18.5,54.5,18.5,42-6.17,55-18.5,19.5-30.17,19.5-53.5v-219h65.5v221c0,25.67-5.75,48.08-17.25,67.25s-27.83,33.92-49,44.25-45.75,15.5-73.75,15.5-52-5.17-73-15.5-37.25-25.08-48.75-44.25Z"
          />
          <rect fill={GRAY} x="252.11" y="125.69" width="73.01" height="73.01" />
          <rect className="wink-right" fill={GRAY} x="394.87" y="125.69" width="73.01" height="73.01" />
        </g>
      </svg>
    </div>
  );
}
