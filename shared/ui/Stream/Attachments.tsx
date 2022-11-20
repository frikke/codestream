import { CSPost } from "codestream-common/api-protocol";
import React from "react";
import { OpenUrlRequestType } from "codestream-common/webview-protocol";

import { HostApi } from "@codestream/webview/webview-api";
import Icon from "./Icon";

interface Props {
	post: CSPost;
}

export const Attachments = (props: Props) => {
	const { post } = props;
	if (!post || !post.files || post.files.length === 0) return null;

	return (
		<div className="related">
			<div className="related-label">Attachments</div>

			{post.files.map((file, index) => {
				// console.log(file);
				//<img src={preview.url} width={preview.width} height={preview.height} />
				const { mimetype = "", url = "", name } = file;
				const isImage = mimetype.startsWith("image");
				return (
					<div
						key={index}
						className="attachment clickable"
						onClick={e => {
							e.preventDefault();
							HostApi.instance.send(OpenUrlRequestType, { url });
						}}
					>
						<span>
							<Icon name="paperclip" />
						</span>
						<span>{name}</span>
						<span>
							{
								// this is necessary for consistent formatting
							}
						</span>
					</div>
				);
			})}
		</div>
	);
};
