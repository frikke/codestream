import React, { Fragment } from "react";
import Icon from "./Icon";
import Tooltip from "./Tooltip";

export default class RetrySpinner extends React.Component {
	state = { loading: false };
	mounted = false;

	componentDidMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	onRetry = async event => {
		event.stopPropagation();
		if (this.state.loading === false) {
			this.setState({ loading: true });
			try {
				await this.props.callback();
			} catch (e) {
			} finally {
				if (this.mounted) this.setState({ loading: false });
			}
		}
	};

	onCancel = event => {
		event.stopPropagation();
		this.props.cancel();
	};

	render() {
		return (
			<div className="retry-spinner">
				{this.state.loading ? (
					<span className="loading loading-spinner-tiny inline-block" />
				) : (
					<Fragment>
						<Tooltip title="Retry" placement="top">
							<Icon name="sync" className="error" onClick={this.onRetry} />
						</Tooltip>
						<Tooltip title="Cancel" placement="top">
							<Icon name="x" className="error" onClick={this.onCancel} />
						</Tooltip>
					</Fragment>
				)}
			</div>
		);
	}
}
