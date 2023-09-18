import { FormattedList } from "react-intl";
import React from "react";

type PropsOf<FunctionComponent> = FunctionComponent extends React.FunctionComponent<infer P>
	? P
	: never;

/*
	Given an array of renderable things, the result will be a grammatically formatted list of the first 3 elements
	and then the number of other elements.

	returns:
		a
		OR
		a and b
		OR
		a, b, and c
		OR
		a, b, c, and x others

		note that if x is 1, instead of "and 1 other", it will say
		a, b, c, and d
*/
export function SmartFormattedList(props: Pick<PropsOf<typeof FormattedList>, "value">) {
	const _value = props.value;
	const otherCount = _value.length - 3;
	const value = _value.slice(0, 3);

	return (
		<>
			<FormattedList style={otherCount > 0 ? "narrow" : "long"} value={value} />
			{otherCount === 1 ? (
				<> and {_value[_value.length - 1]}</>
			) : otherCount > 0 ? (
				<> and {otherCount} others</>
			) : (
				""
			)}
		</>
	);
}
