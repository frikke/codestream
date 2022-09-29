import { isEqual as _isEqual } from "lodash-es";
import React from "react";
import { connect } from "react-redux";
import { DelayedRender } from "../Container/DelayedRender";
import { Loading } from "../Container/Loading";
import { getPostsForStream } from "../store/posts/reducer";
import { safe } from "../utils";
import { fetchPosts, fetchThread } from "./actions";

const mapStateToProps = (state, props) => {
	const { streamId, isThread, threadId } = props.childProps;
	let posts = getPostsForStream(state, streamId);

	if (threadId) {
		posts = posts.filter(p => p.id === threadId || p.parentPostId === threadId);
	}

	return {
		isThread,
		posts,
		postIds: posts.map(p => p.id),
		lastReadForStream: state.umis.lastReads[streamId],
	};
};

export default Child => {
	const initializeCount = 50;
	const batchCount = 100;

	const DataProvider = connect(mapStateToProps, {
		fetchPosts,
		fetchThread,
	})(
		class Provider extends React.Component {
			state = { isFetching: false, isInitialized: false, posts: [], hasMore: true };

			static defaultProps = {
				onDidInitialize() {},
			};
			componentDidMount() {
				this.initialize();
			}

			componentDidUpdate(prevProps, prevState) {
				if (!prevState.isInitialized && this.state.isInitialized) {
					this.props.onDidInitialize();
				}
				if (this.props.isThread && prevProps.isThread) {
					if (this.props.childProps.threadId !== prevProps.childProps.threadId)
						return this.initialize();
				}
				if (
					!this.state.isFetching &&
					prevProps.childProps.streamId !== this.props.childProps.streamId
				) {
					return this.initialize();
				}
				if (!this.state.isFetching && !_isEqual(prevProps.postIds, this.props.postIds)) {
					this.setState({ posts: this._prunePosts() });
				}
			}

			async initialize() {
				this.setState({ isInitialized: false });

				const { useCache, childProps, isThread, fetchPosts, fetchThread } = this.props;
				const { streamId, teamId, threadId } = childProps;

				if (isThread) {
					if (!useCache && threadId && !this.props.posts.some(p => p.id === threadId)) {
						await fetchThread(streamId, threadId);
					}

					this.setState({
						isInitialized: true,
						posts: this._prunePosts(),
						hasMore: false,
					});
				} else {
					if (this.props.posts.length < initializeCount) {
						const { more } = useCache
							? { more: false }
							: await fetchPosts({ streamId, teamId, limit: initializeCount });

						this.setState({
							isInitialized: true,
							posts: this._prunePosts(),
							hasMore: more,
						});
					} else {
						this.setState({
							isInitialized: true,
							posts: this._prunePosts(),
							hasMore: useCache ? false : true,
						});
					}
				}
			}

			_prunePosts() {
				if (this.props.skipReadPosts) {
					if (!this.props.lastReadForStream) return [];
					return this.props.posts.filter(post => post.seqNum > this.props.lastReadForStream);
				}
				return this.props.posts;
			}

			// Might need to create `onDidScrollToBottom` too
			onDidScrollToTop = () => {
				if (!this.props.childProps.threadId && this.state.hasMore) {
					const { posts } = this.state;
					const earliestLocalSeqNum = safe(() => posts[0].seqNum);
					if (earliestLocalSeqNum && earliestLocalSeqNum > 1) {
						this.loadMore(earliestLocalSeqNum);
					} else {
						this.setState({ hasMore: false });
					}
				}
			};

			loadMore = async seqNum => {
				if (!this.state.isInitialized || this.state.isFetching) {
					return;
				}

				this.setState({ isFetching: true });
				const { fetchPosts, childProps } = this.props;
				const { streamId, teamId } = childProps;

				const { more } = await fetchPosts({
					streamId,
					teamId,
					limit: batchCount,
					before: seqNum,
				});

				this.onScrollStop(() => {
					this.setState({
						posts: this._prunePosts(),
						isFetching: false,
						hasMore: more,
					});
				});
			};

			scrollTimeout = null;

			onScrollStop = fn => {
				if (!this.scrollTimeout) {
					fn();
				} else {
					this.onDidStopScrolling = fn;
				}
			};

			onScroll = () => {
				if (this.scrollTimeout) {
					clearTimeout(this.scrollTimeout);
				}
				this.scrollTimeout = setTimeout(() => {
					this.scrollTimeout = null;
					try {
						this.onDidStopScrolling && this.onDidStopScrolling();
					} catch (e) {
						console.error(e);
					} finally {
						this.onDidStopScrolling = null;
					}
				}, 500);
			};

			render() {
				if (!this.state.isInitialized)
					return (
						<DelayedRender>
							<Loading style={{ height: "100%" }} />
						</DelayedRender>
					);

				const { childProps } = this.props;

				return (
					<Child
						{...childProps}
						{...{
							posts: this.state.posts,
							onDidScrollToTop: this.onDidScrollToTop,
							onScroll: this.onScroll,
							isFetchingMore: this.state.isFetching,
							hasMore: this.state.hasMore,
						}}
					/>
				);
			}
		}
	);

	return React.forwardRef((props, ref) => {
		const { onDidInitialize, useCache, skipReadPosts, ...childProps } = props;
		return (
			<DataProvider
				onDidInitialize={onDidInitialize}
				useCache={useCache}
				skipReadPosts={skipReadPosts}
				childProps={{ ...childProps, ref }}
			/>
		);
	});
};
