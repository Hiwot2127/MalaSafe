import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "hsl(220 38% 22%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 24,
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7 23.5 L7 9 L16 17.5 L25 9 L25 23.5"
            stroke="hsl(40 32% 98%)"
            strokeWidth="2.5"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      </div>
    ),
    size,
  );
}
