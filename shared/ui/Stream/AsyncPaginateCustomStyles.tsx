import React from "react";
import { AsyncPaginate } from "react-select-async-paginate";
import Select from "react-select";

// Need to use a lot of !important here to override react-select built in styling
export const selectStyles = {
	control: (provided, state) => ({
		...provided,
		boxShadow: "none",
		border: `1px solid ${
			state.isFocused ? "var(--text-focus-border-color)" : "var(--base-border-color)"
		} !important`,
		background: "var(--base-background-color) !important",
		margin: 0,
		fontFamily: "inherit",
		fontSize: "13px",
		minHeight: "28px !important",
		borderTopRightRadius: "2px !important",
		borderTopLeftRadius: "2px !important",
		borderBottomRightRadius: 0,
		borderBottomLeftRadius: 0,
		zIndex: 9999,
	}),
	input: provided => ({
		...provided,
		borderRadius: "2px",
		fontFamily: "inherit",
		fontSize: "13px",
		color: "var(--text-color) !important",
		input: {
			padding: "0 !important",
			outline: "none !important",
		},
		zIndex: 9999,
	}),
	singleValue: provided => ({
		...provided,
		color: "var(--text-color) !important",
		fontSize: "13px",
		marginTop: "0",
		marginBottom: "0",
	}),
	multiValue: provided => ({
		...provided,
		fontSize: "13px",
		marginTop: "0",
		marginBottom: "0",
		backgroundColor: "var(--base-background-color) !important",
	}),
	valueContainer: provided => ({
		...provided,
		marginTop: "-1px !important",
		height: "29px !important",
	}),
	multiValueLabel: provided => ({
		...provided,
		color: "var(--text-color)",
		display: "none",
	}),
	multiValueRemove: provided => ({
		...provided,
		display: "none",
	}),
	menu: provided => ({
		...provided,
		zIndex: "2",
		border: `1px solid var(--text-focus-border-color)`,
		backgroundColor: "var(--base-background-color) !important",
		borderTopRightRadius: 0,
		borderTopLeftRadius: 0,
		marginTop: 0,
	}),
	menuList: provided => ({
		...provided,
		background: "var(--base-background-color) !important",
		borderTopLeftRadius: "0px !important",
		borderTopRightRadius: "0px !important",
		paddingTop: "0px !important",
		paddingBottom: "0px !important",
	}),
	option: (provided, state) => ({
		...provided,
		padding: "5px 10px",
		cursor: "pointer",
		"&:hover": {
			background: "var(--text-focus-border-color) !important",
			color: "white",
		},
		background:
			state.isSelected || state.isFocused ? "var(--text-focus-border-color) !important" : "unset",
		color: state.isSelected || state.isFocused ? "white !important" : "inherit",
	}),
	placeholder: provided => ({
		...provided,
		fontSize: "13px !important",
		fontFamily: "inherit !important",
		opacity: "0.5 !important",
		color: "var(--text-color) !important",
	}),
	dropdownIndicator: provided => ({
		...provided,
		color: "var(--text-color) !important",
		opacity: "1",
		padding: "0 6px",
		width: "29px !important",
	}),
	indicatorSeparator: provided => ({
		...provided,
		display: "none !important",
	}),
};

export const asyncSelectStyles = {
	control: (provided, state) => ({
		...provided,
		boxShadow: "none",
		border: `1px solid ${
			state.isFocused ? "var(--text-focus-border-color)" : "var(--base-border-color)"
		} !important`,
		background: "var(--base-background-color) !important",
		margin: 0,
		fontFamily: "inherit",
		fontSize: "13px",
		minHeight: "28px !important",
		borderTopRightRadius: "2px !important",
		borderTopLeftRadius: "2px !important",
		borderBottomRightRadius: 0,
		borderBottomLeftRadius: 0,
		zIndex: 9999,
	}),
	input: provided => ({
		...provided,
		borderRadius: "2px",
		fontFamily: "inherit",
		fontSize: "13px",
		color: "var(--text-color) !important",
		input: {
			padding: "0 !important",
			outline: "none !important",
		},
		zIndex: 9999,
	}),
	singleValue: provided => ({
		...provided,
		color: "var(--text-color) !important",
		fontSize: "13px",
		marginTop: "0",
		marginBottom: "0",
	}),
	multiValue: provided => ({
		...provided,
		fontSize: "13px",
		marginTop: "0",
		marginBottom: "0",
		backgroundColor: "var(--base-background-color) !important",
	}),
	valueContainer: provided => ({
		...provided,
		marginTop: "-1px !important",
		height: "29px !important",
	}),
	multiValueLabel: provided => ({
		...provided,
		color: "var(--text-color)",
		display: "none",
	}),
	multiValueRemove: provided => ({
		...provided,
		display: "none",
	}),
	menu: provided => ({
		...provided,
		zIndex: "2",
		border: `1px solid var(--text-focus-border-color)`,
		backgroundColor: "var(--base-background-color) !important",
		borderTopRightRadius: 0,
		borderTopLeftRadius: 0,
		marginTop: 0,
	}),
	menuList: provided => ({
		...provided,
		background: "var(--base-background-color) !important",
		borderTopLeftRadius: "0px !important",
		borderTopRightRadius: "0px !important",
		paddingTop: "0px !important",
		paddingBottom: "0px !important",
	}),
	option: (provided, state) => ({
		...provided,
		padding: "5px 10px",
		cursor: "pointer",
		"&:hover": {
			background: "var(--text-focus-border-color) !important",
			color: "white",
		},
		background:
			state.isSelected || state.isFocused ? "var(--text-focus-border-color) !important" : "unset",
		color: state.isSelected || state.isFocused ? "white !important" : "inherit",
	}),
	placeholder: provided => ({
		...provided,
		fontSize: "13px !important",
		fontFamily: "inherit !important",
		opacity: "0.5 !important",
		color: "var(--text-color) !important",
	}),
	dropdownIndicator: provided => ({
		...provided,
		color: "var(--text-color) !important",
		opacity: "1",
		padding: "0 6px",
		width: "29px !important",
	}),
	indicatorSeparator: provided => ({
		...provided,
		display: "none !important",
	}),
};

export const SelectCustomStyles = props => {
	return <Select {...props} styles={selectStyles} />;
};

export const AsyncPaginateCustomStyles = props => {
	return <AsyncPaginate {...props} styles={asyncSelectStyles} />;
};
