import { useState, useCallback } from "react";
import { HostApi } from "../../webview-api";
import { UserSearchRequestType } from "@codestream/protocols/agent";

interface UserSearchResults {
	id: string;
	email: string;
	fullName?: string;
	display?: string;
	headshot?: any;
}

export const useUserSearch = () => {
	const [userSearchResults, setUserSearchResults] = useState<UserSearchResults[]>([]);

	const fetchUsers = useCallback(
		async (
			query: string,
			mappingStyle: string = "default",
			callback?: Function
		): Promise<void | { display: string; id: string }> => {
			let _query = query.toLowerCase();

			if (_query.length > 2) {
				try {
					const response = await HostApi.instance.send(UserSearchRequestType, { query: _query });

					const users = response.users.map(user => {
						const userName = user?.name || user?.email || "";
						const userId = user.id?.toString() || "";
						const email = user?.email || "";

						if (mappingStyle === "default") {
							return {
								fullName: userName,
								id: userId,
								email,
							};
						} else {
							const display = userName;
							const id = `<collab-mention data-value="@${userName}" data-type="NR_USER" data-mentionable-item-id="${userId}">${userName}</collab-mention>`;
							return {
								display,
								id,
								email,
								headshot: { email, name: userName },
							};
						}
					});
					if (callback) {
						callback(users);
					}
					setUserSearchResults(users);
				} catch (error) {
					if (callback) {
						callback([]);
					}
					setUserSearchResults([]);
				}
			} else if (_query === "ai" && mappingStyle === "mentions") {
				const aiUserObject = {
					display: "AI",
					id: `<collab-mention data-value="@AI" data-type="NR_BOT" data-mentionable-item-id="NR_BOT">AI</collab-mention>`,
					email: "",
					headshot: { email: "", name: "AI" },
				};
				if (callback) {
					callback([aiUserObject]);
				}
				setUserSearchResults([aiUserObject]);
			} else {
				if (callback) {
					callback([]);
				}
				setUserSearchResults([]);
			}

			return;
		},
		[]
	);
	return {
		userSearchResults,
		fetchUsers,
	};
};
