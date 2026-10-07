import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
	/** Rendered instead of the canvas when it failed to load or crashed. */
	fallback: ReactNode;
	children: ReactNode;
}

/**
 * Keeps the workspace usable when the graph canvas fails (its chunk did not
 * load, or Cytoscape threw in this browser): shows `fallback` instead.
 */
export default class CanvasErrorBoundary extends Component<Props, { failed: boolean }> {
	state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('Graph canvas failed; showing the text view instead.', error, info.componentStack);
	}

	render() {
		return this.state.failed ? this.props.fallback : this.props.children;
	}
}
