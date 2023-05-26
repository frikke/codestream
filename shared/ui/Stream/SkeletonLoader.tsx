import styled, { keyframes } from "styled-components";

// Keyframes for pulsing animation
const pulseAnimation = keyframes`
  0% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 0.4;
  }
`;

// Skeleton Loader Bar component
export const SkeletonLoader = styled.div`
	height: 12px;
	background-color: var(--base-background-color);
	animation: ${pulseAnimation} 1.5s ease-in-out infinite;
	border-radius: 3px;
`;
