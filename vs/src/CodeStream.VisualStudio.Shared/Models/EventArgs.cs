﻿using System;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Models;

namespace CodeStream.VisualStudio.Shared.Events
{
	public sealed class LanguageServerReadyEvent : EventBase
	{
		public bool IsReady { get; set; }
	}

	public sealed class LanguageServerDisconnectedEvent : EventBase
	{
		public string Message { get; }
		public string Description { get; }
		public string Reason { get; }
		public Exception Exception { get; }
		public bool IsReloading { get; set; }

		public LanguageServerDisconnectedEvent(
			string message,
			string description,
			string reason,
			Exception exception
		)
		{
			Message = message;
			Description = description;
			Reason = reason;
			Exception = exception;
		}
	}

	public sealed class SessionReadyEvent : EventBase { }

	public sealed class SessionLogoutEvent : EventBase { }

	public sealed class RefreshMarginEvent : EventBase { }

	public sealed class SessionDidStartSignInEvent : EventBase { }

	public sealed class SessionDidStartSignOutEvent : EventBase { }

	public sealed class SessionDidFailSignInEvent : EventBase { }

	public sealed class WebviewDidInitializeEvent : EventBase { }

	public enum TextDocumentChangedReason
	{
		Unknown,
		Scrolled,
		Edited,
		ViewportHeightChanged
	}

	public sealed class TextDocumentChangedEvent : EventBase
	{
		public TextDocumentChangedReason Reason { get; set; }
	}

	public sealed class ConnectionStatusChangedEvent : EventBase
	{
		public bool? Reset { get; set; }

		public ConnectionStatus Status { get; set; }
	}

	public sealed class MarkerGlyphVisibilityEvent : EventBase
	{
		public bool IsVisible { get; set; }
	}

	public sealed class AutoHideMarkersEvent : EventBase
	{
		public bool Value { get; set; }
	}

	public sealed class DocumentMarkerChangedEvent : EventBase
	{
		public Uri Uri { get; set; }
	}

	public sealed class UserPreferencesChangedEvent : EventBase
	{
		public DidChangeUserPreferencesData Data { get; }

		public UserPreferencesChangedEvent(DidChangeUserPreferencesData data)
		{
			Data = data;
		}
	}

	public sealed class UserUnreadsChangedEvent : EventBase
	{
		public DidChangeUnreadsData Data { get; }

		public UserUnreadsChangedEvent(DidChangeUnreadsData data)
		{
			Data = data;
		}
	}
}
