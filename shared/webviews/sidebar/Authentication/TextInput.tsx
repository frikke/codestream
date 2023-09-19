import React, { PropsWithChildren, useCallback, useState } from "react";
import { AnyObject } from "../utils";

interface TextInputProps extends Pick<React.HTMLAttributes<HTMLInputElement>, "onPaste"> {
	value: string;
	onChange(value: string): void;
	onValidityChanged?(name: string, valid: boolean): void;
	name?: string;
	type?: string;
	required?: boolean;
	validate?(value: string): boolean;
	placeholder?: string;
	nativeProps?: AnyObject;
	autoFocus?: boolean;
	hasError?: boolean;
	disabled?: boolean;
	baseBorder?: boolean;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(function (
	props: PropsWithChildren<TextInputProps>,
	ref: React.Ref<HTMLInputElement>
) {
	if (props.validate !== undefined) {
		if (props.onValidityChanged === undefined || props.name === undefined)
			throw new Error(
				"<TextInput/> validations require `validate`, `onValidityChanged`, and `name` props"
			);
	}

	const [isTouched, setIsTouched] = useState(false);

	const onChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			event.preventDefault();
			props.onChange(event.currentTarget.value);
		},
		[props.onChange]
	);

	const onBlur = useCallback(() => {
		if (!isTouched) setIsTouched(true);
		if (props.validate !== undefined) {
			props.onValidityChanged!(props.name!, props.validate(props.value));
		}
	}, [props.value, props.validate, props.name]);

	return (
		<input
			disabled={props?.disabled}
			ref={ref}
			className={
				"input-text" +
				(props.hasError ? " has-error" : "") +
				(props.baseBorder ? " base-border" : "")
			}
			type={props.type}
			name={props.name}
			value={props.value}
			onChange={onChange}
			onBlur={onBlur}
			placeholder={props.placeholder}
			onPaste={props.onPaste}
			autoFocus={props.autoFocus}
			{...props.nativeProps}
		/>
	);
});

TextInput.defaultProps = { type: "text", nativeProps: {} };
