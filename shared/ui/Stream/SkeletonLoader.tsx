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
// margins here are the standard margins we have between text throughout the app
// can be overwritten with style tag
export const SkeletonLoader = styled.div`
	height: 12px;
	margin-top: 6px;
	margin-bottom: 6px;
	margin-right: 10px;
	background-color: var(--base-background-color);
	animation: ${pulseAnimation} 1.5s ease-in-out infinite;
	border-radius: 3px;
`;

export const SkeletonFlexContainer = styled.div`
	display: flex;
	justify-content: space-between;
`;
