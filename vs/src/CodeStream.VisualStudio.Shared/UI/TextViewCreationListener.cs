using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Core.Logging.Instrumentation;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Core.Adornments;
using Microsoft.VisualStudio.Editor;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.TextManager.Interop;
using Microsoft.VisualStudio.Utilities;
using Serilog;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel.Composition;
using System.Diagnostics;
using System.Linq;
using System.Reactive.Concurrency;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.VisualStudio.Threading;
using System.Windows.Media;
using CodeStream.VisualStudio.Shared.Events;
using CodeStream.VisualStudio.Shared.Extensions;
using CodeStream.VisualStudio.Shared.Models;
using CodeStream.VisualStudio.Shared.Services;
using CodeStream.VisualStudio.Shared.UI.Margins;

using Task = System.Threading.Tasks.Task;

namespace CodeStream.VisualStudio.Shared.UI
{
	public class TextViewCreationListenerLogger { }

	[Export(typeof(IVsTextViewCreationListener))]
	[Export(typeof(IWpfTextViewConnectionListener))]
	[ContentType(ContentTypes.Text)]
	[TextViewRole(PredefinedTextViewRoles.Interactive)]
	[TextViewRole(PredefinedTextViewRoles.Document)]
	[TextViewRole(PredefinedTextViewRoles.PrimaryDocument)]
	[TextViewRole(PredefinedTextViewRoles.Editable)]
	public class TextViewCreationListener
		: IVsTextViewCreationListener,
			IWpfTextViewConnectionListener
	{
		private readonly ILogger _log = LogManager.ForContext<TextViewCreationListenerLogger>();
		private IWpfTextView _focusedWpfTextView;

		internal const string LayerName = PropertyNames.TextViewCreationListenerLayerName;

		private static readonly object WeakTableLock = new object();
		private static readonly ConditionalWeakTable<
			ITextBuffer,
			HashSet<IWpfTextView>
		> TextBufferTable = new ConditionalWeakTable<ITextBuffer, HashSet<IWpfTextView>>();

		[Import]
		public ICodeStreamAgentServiceFactory CodeStreamAgentServiceFactory { get; set; }

		[Import]
		public ICodeStreamService CodeStreamService { get; set; }

		[Import]
		public ISessionService SessionService { get; set; }

		[Import]
		public IEventAggregator EventAggregator { get; set; }

		[Import]
		public IEditorService EditorService { get; set; }

		[Import]
		public IWpfTextViewCache TextViewCache { get; set; }

		[Import]
		public IVsEditorAdaptersFactoryService EditorAdaptersFactoryService { get; set; }

		[Import]
		public ITextDocumentFactoryService TextDocumentFactoryService { get; set; }

		[ImportMany]
		public IEnumerable<IWpfTextViewMarginProvider> TextViewMarginProviders { get; set; }

		/// <summary>
		/// This is needed for the Highlight adornment layer
		/// </summary>
		[Export(typeof(AdornmentLayerDefinition))]
		[Name(LayerName)]
		[Order(Before = PredefinedAdornmentLayers.Selection)]
		[TextViewRole(PredefinedTextViewRoles.Interactive)]
		[TextViewRole(PredefinedTextViewRoles.Document)]
		[TextViewRole(PredefinedTextViewRoles.PrimaryDocument)]
		[TextViewRole(PredefinedTextViewRoles.Editable)]
		public AdornmentLayerDefinition AlternatingLineColor = null;

		/// <summary>
		/// SubjectBuffersConnected happens first
		/// </summary>
		/// <param name="wpfTextView"></param>
		/// <param name="reason"></param>
		/// <param name="subjectBuffers"></param>
		public void SubjectBuffersConnected(
			IWpfTextView wpfTextView,
			ConnectionReason reason,
			Collection<ITextBuffer> subjectBuffers
		)
		{
			try
			{
				var logPrefix = $"{nameof(SubjectBuffersConnected)}";
				using (var metrics = _log.WithMetrics($"{logPrefix} "))
				{
					if (wpfTextView == null || !wpfTextView.HasValidDocumentRoles())
					{
						return;
					}

					if (
						!TextDocumentFactoryService.TryGetTextDocument(
							wpfTextView,
							out var virtualTextDocument
						)
					)
					{
						_log.Warning($"{logPrefix} Could not create virtualTextDocument");
						return;
					}

					_log.Verbose($"{logPrefix} pre-Lock");
					lock (WeakTableLock)
					{
						_log.Verbose($"{logPrefix} in-Lock");
						foreach (var buffer in subjectBuffers)
						{
							if (!TextBufferTable.TryGetValue(buffer, out var textViews))
							{
								textViews = new HashSet<IWpfTextView>();
								TextBufferTable.Add(buffer, textViews);
							}

							textViews.Add(wpfTextView);
						}
						using (metrics.Measure($"{logPrefix} Building properties"))
						{
							if (virtualTextDocument.SupportsMarkers)
							{
								wpfTextView.Properties.GetOrCreateSingletonProperty(
									PropertyNames.DocumentMarkerManager,
									() =>
										new DocumentMarkerManager(
											CodeStreamAgentServiceFactory.Create(),
											wpfTextView,
											virtualTextDocument
										)
								);
							}
							wpfTextView.Properties.GetOrCreateSingletonProperty(
								PropertyNames.TextViewDocument,
								() => virtualTextDocument
							);
							wpfTextView.Properties.GetOrCreateSingletonProperty(
								PropertyNames.TextViewState,
								() => new TextViewState()
							);
#if DEBUG
							if (TextViewCache == null)
							{
								Debugger.Break();
							}
#endif
						}
						TextViewCache?.Add(virtualTextDocument, wpfTextView);
					}
					_log.Verbose($"{logPrefix} Uri={virtualTextDocument.Uri}");
				}
			}
			catch (Exception ex)
			{
				_log.Error(ex, nameof(SubjectBuffersConnected));
			}
		}

		/// <summary>
		/// VsTextViewCreated is created after all margins, etc.
		/// </summary>
		/// <param name="textViewAdapter"></param>
		public void VsTextViewCreated(IVsTextView textViewAdapter)
		{
			try
			{
				IWpfTextView wpfTextView;
				List<ICodeStreamWpfTextViewMargin> textViewMarginProviders;
				using (var metrics = _log.WithMetrics($"{nameof(VsTextViewCreated)}"))
				{
					wpfTextView = EditorAdaptersFactoryService.GetWpfTextView(textViewAdapter);
					if (wpfTextView == null || !wpfTextView.HasValidDocumentRoles())
					{
						return;
					}

					using (metrics.Measure($"{nameof(VsTextViewCreated)} created margins"))
					{
						// find all of our textView margin providers (they should already have been created at this point)
						textViewMarginProviders = TextViewMarginProviders
							.Where(p => p is ICodeStreamMarginProvider)
							.Select(p => (p as ICodeStreamMarginProvider)?.TextViewMargin)
							.Where(m => m != null)
							.ToList();

						if (!textViewMarginProviders.AnySafe())
						{
							_log.LocalWarning($"No {nameof(textViewMarginProviders)}");
						}
					}

					wpfTextView.Properties.AddProperty(
						PropertyNames.TextViewMarginProviders,
						textViewMarginProviders
					);
					Debug.Assert(EventAggregator != null, nameof(EventAggregator) + " != null");
					using (metrics.Measure($"{nameof(VsTextViewCreated)} CreatedDisposables"))
					{
						var textViewLayoutChangedSubject =
							new Subject<TextViewLayoutChangedSubject>();
						// some are listening on the main thread since we have to change the UI state
						var disposables = new List<IDisposable>
						{
							EventAggregator
								.GetEvent<SessionReadyEvent>()
								.ObserveOn(Scheduler.Default)
								.Subscribe(e =>
								{
									_log.Verbose(
										$"{nameof(VsTextViewCreated)} SessionReadyEvent Session IsReady={SessionService.IsReady}"
									);
									if (SessionService.IsReady)
									{
										_ = OnSessionReadyAsync(wpfTextView);
									}
								}),
							EventAggregator
								.GetEvent<SessionLogoutEvent>()
								.ObserveOnApplicationDispatcher()
								.Subscribe(
									_ => OnSessionLogout(wpfTextView, textViewMarginProviders)
								),
							EventAggregator
								.GetEvent<RefreshMarginEvent>()
								.ObserveOnApplicationDispatcher()
								.Subscribe(x =>
								{
									if (SessionService.IsReady)
									{
										_ = RefreshGutterAsync(wpfTextView);
									}
								}),
							textViewLayoutChangedSubject
								.Throttle(TimeSpan.FromMilliseconds(150))
								.ObserveOn(Scheduler.Default)
								.Subscribe(subject =>
								{
									_ = OnTextViewLayoutChangedSubjectHandlerAsync(subject);
								}),
						};

						wpfTextView.Properties.AddProperty(
							PropertyNames.TextViewEvents,
							disposables
						);
						wpfTextView.Properties.AddProperty(
							PropertyNames.TextViewLayoutChangedSubject,
							textViewLayoutChangedSubject
						);
					}
				}

				using (
					var metrics = _log.WithMetrics(
						$"{nameof(VsTextViewCreated)}:OnSessionReady Session IsReady={SessionService.IsReady}"
					)
				)
				{
					if (SessionService.IsReady)
					{
						_ = OnSessionReadyAsync(wpfTextView);
					}
					else
					{
						textViewMarginProviders.Hide();
						using (
							metrics.Measure(
								$"{nameof(VsTextViewCreated)} {nameof(ChangeActiveEditor)}"
							)
						)
						{
							ChangeActiveEditor(wpfTextView, metrics);
						}
					}
				}
			}
			catch (Exception ex)
			{
				_log.Error(ex, nameof(VsTextViewCreated));
			}
		}

		private async Task RefreshGutterAsync(IWpfTextView wpfTextView)
		{
			try
			{
				using (_ = _log.WithMetrics(nameof(TriggerMarginOnTextViewLayoutChangedAsync)))
				{
					await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
					wpfTextView.Properties
						.GetProperty<List<ICodeStreamWpfTextViewMargin>>(
							PropertyNames.TextViewMarginProviders
						)
						.OnRefreshMargins();
				}
			}
			catch (Exception ex)
			{
				_log.Warning(ex, nameof(TriggerMarginOnTextViewLayoutChangedAsync));
			}

			await Task.CompletedTask;
		}

		public void SubjectBuffersDisconnected(
			IWpfTextView wpfTextView,
			ConnectionReason reason,
			Collection<ITextBuffer> subjectBuffers
		)
		{
			try
			{
				using (_log.WithMetrics($"{nameof(SubjectBuffersDisconnected)}"))
				{
					if (wpfTextView == null || !wpfTextView.HasValidDocumentRoles())
					{
						return;
					}

					if (
						!wpfTextView.Properties.TryGetProperty(
							PropertyNames.TextViewDocument,
							out IVirtualTextDocument textViewDocument
						)
					)
					{
						return;
					}

					lock (WeakTableLock)
					{
						// we need to check all buffers reported since we will be called after actual changes have happened.
						// for example, if content type of a buffer changed, we will be called after it is changed, rather than before it.
						foreach (var buffer in subjectBuffers)
						{
							if (!TextBufferTable.TryGetValue(buffer, out var textViews))
							{
								continue;
							}

							textViews.Remove(wpfTextView);
							var textViewDocumentId = textViewDocument.Id;
							TextViewCache.Remove(textViewDocument, wpfTextView);

							if (textViews.Count != 0)
							{
								continue;
							}

							TextBufferTable.Remove(buffer);

							wpfTextView.LayoutChanged -= OnTextViewLayoutChanged;
							wpfTextView.GotAggregateFocus -= TextView_GotAggregateFocus;
							wpfTextView.ZoomLevelChanged -= OnZoomLevelChanged;

							wpfTextView.Properties.RemovePropertySafe(
								PropertyNames.TextViewDocument
							);
							wpfTextView.Properties.RemovePropertySafe(PropertyNames.TextViewState);
							wpfTextView.Properties.RemovePropertySafe(
								PropertyNames.DocumentMarkers
							);
							wpfTextView.Properties.RemovePropertySafe(
								PropertyNames.DocumentMarkerManager
							);
							wpfTextView.Properties.RemovePropertySafe(
								PropertyNames.TextViewMarginProviders
							);
							wpfTextView.Properties.TryDisposeProperty<HighlightAdornmentManager>(
								PropertyNames.AdornmentManager
							);

							wpfTextView.Properties.TryDisposeProperty<
								Subject<TextViewLayoutChangedSubject>
							>(PropertyNames.TextViewLayoutChangedSubject);

							wpfTextView.Properties.TryDisposeListProperty(
								PropertyNames.TextViewEvents
							);
							wpfTextView.Properties.TryDisposeListProperty(
								PropertyNames.TextViewLocalEvents
							);
							_log.Verbose(
								$"{nameof(SubjectBuffersDisconnected)} virtualTextViewDocumentId={textViewDocumentId}"
							);
						}

						if (TextViewCache.Count() == 0)
						{
							ResetActiveEditor();
						}
					}
				}
			}
			catch (Exception ex)
			{
				_log.Error(ex, nameof(SubjectBuffersDisconnected));
			}
		}

		public Task OnSessionReadyAsync(IWpfTextView wpfTextView)
		{
			return Task.Run(
				async delegate
				{
					await TaskScheduler.Default;
					try
					{
						if (
							wpfTextView.Properties.TryGetProperty(
								PropertyNames.TextViewState,
								out TextViewState state
							)
						)
						{
							if (state != null && !state.Initialized)
							{
								var logPrefix = $"{nameof(OnSessionReadyAsync)}";
								using (var metrics = _log.WithMetrics($"{logPrefix} (background)"))
								{
									metrics.Log($"{logPrefix} state=initializing");
									wpfTextView.Properties.AddProperty(
										PropertyNames.TextViewLocalEvents,
										new List<IDisposable>
										{
											EventAggregator
												.GetEvent<DocumentMarkerChangedEvent>()
												.ObserveOn(Scheduler.Default)
												.Subscribe(e =>
												{
													_log.Verbose(
														$"{nameof(DocumentMarkerChangedEvent)} State={state.Initialized}, _={e?.Uri}"
													);
													_ = OnDocumentMarkerChangedAsync(
														wpfTextView,
														e
													);
												}),
										}
									);

									using (metrics.Measure($"{logPrefix} TrySetMarkers"))
									{
										if (
											wpfTextView.Properties.TryGetProperty(
												PropertyNames.DocumentMarkerManager,
												out DocumentMarkerManager documentMarkerManager
											)
											&& documentMarkerManager != null
										)
										{
											await documentMarkerManager.TrySetMarkersAsync();
										}
									}
								}

								await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(
									CancellationToken.None
								);
								using (var metrics = _log.WithMetrics($"{logPrefix} (UI)"))
								{
									wpfTextView.Properties.AddProperty(
										PropertyNames.AdornmentManager,
										new HighlightAdornmentManager(wpfTextView)
									);

									wpfTextView.Properties.TryGetProperty(
										PropertyNames.TextViewMarginProviders,
										out List<ICodeStreamWpfTextViewMargin> margins
									);

									if (margins != null)
									{
										using (
											metrics.Measure(
												$"{logPrefix} ICodeStreamWpfTextViewMargin.OnSessionReady()"
											)
										)
										{
											margins.OnSessionReady();
										}
									}

									// keep this at the end -- we want this to be the first handler
									wpfTextView.LayoutChanged += OnTextViewLayoutChanged;
									wpfTextView.GotAggregateFocus += TextView_GotAggregateFocus;
									wpfTextView.ZoomLevelChanged += OnZoomLevelChanged;

									ChangeActiveEditor(wpfTextView, metrics);
									SetZoomLevelCore(wpfTextView.ZoomLevel, metrics);

									if (margins != null)
									{
										using (
											metrics.Measure(
												$"{logPrefix} OnZoomChanged ZoomLevel=${wpfTextView.ZoomLevel}"
											)
										)
										{
											margins.OnZoomChanged(
												wpfTextView.ZoomLevel,
												new ScaleTransform(
													wpfTextView.ZoomLevel / 100,
													wpfTextView.ZoomLevel / 100
												)
											);
										}
										using (metrics.Measure($"{logPrefix} OnMarkerChanged"))
										{
											margins.OnMarkerChanged();
										}
									}

									metrics.Log($"{logPrefix} state=true");
									state.Initialized = true;
								}
							}
						}
					}
					catch (Exception ex)
					{
						_log.Error(ex, $"{nameof(OnSessionReadyAsync)}");
					}
				}
			);
		}

		private void SetZoomLevelCore(double zoomLevel, IMetricsBase metrics)
		{
			using (metrics?.Measure($"{nameof(SetZoomLevelCore)}"))
			{
				CodeStreamService?.BrowserService?.SetZoomInBackground(zoomLevel);
			}
		}

		private void OnZoomLevelChanged(object sender, ZoomLevelChangedEventArgs e)
		{
			_log.Verbose($"{nameof(OnZoomLevelChanged)}");
			using (var metrics = _log.WithMetrics($"{nameof(OnZoomLevelChanged)}"))
			{
				SetZoomLevelCore(e.NewZoomLevel, metrics);
			}
		}

		private void ResetActiveEditor()
		{
			try
			{
				using (_ = _log.WithMetrics(nameof(ResetActiveEditor)))
				{
					_ = CodeStreamService.ResetActiveEditorAsync();
					_focusedWpfTextView = null;
					SessionService.LastActiveFileUri = null;
				}
			}
			catch (Exception ex)
			{
				_log.Warning(ex, nameof(ResetActiveEditor));
			}
		}

		private void ChangeActiveEditor(IWpfTextView wpfTextView, IMetricsBase metrics = null)
		{
			try
			{
				using (metrics?.Measure($"{nameof(ChangeActiveEditor)}"))
				{
					if (wpfTextView == null)
					{
						return;
					}

					if (
						!wpfTextView.Properties.TryGetProperty(
							PropertyNames.TextViewDocument,
							out IVirtualTextDocument virtualTextDocument
						)
					)
					{
						return;
					}

					if (virtualTextDocument == null)
					{
						return;
					}

					var activeTextEditor = EditorService.CreateActiveTextEditor(
						virtualTextDocument,
						wpfTextView
					);

					if (activeTextEditor == null)
					{
						return;
					}

					_ = CodeStreamService.ChangeActiveEditorAsync(
						virtualTextDocument.Uri,
						activeTextEditor
					);
					SetZoomLevelCore(wpfTextView.ZoomLevel, metrics);
				}
			}
			catch (Exception ex)
			{
				_log.Warning(ex, nameof(ChangeActiveEditor));
			}
		}

		private void OnSessionLogout(
			IWpfTextView wpfTextView,
			List<ICodeStreamWpfTextViewMargin> textViewMarginProviders
		)
		{
			try
			{
				if (
					wpfTextView.Properties.TryGetProperty(
						PropertyNames.TextViewState,
						out TextViewState state
					)
				)
				{
					state.Initialized = false;
				}

				wpfTextView.Properties.TryDisposeListProperty(PropertyNames.TextViewLocalEvents);
				wpfTextView.Properties.TryDisposeProperty<HighlightAdornmentManager>(
					PropertyNames.AdornmentManager
				);
				wpfTextView.LayoutChanged -= OnTextViewLayoutChanged;
				wpfTextView.GotAggregateFocus -= TextView_GotAggregateFocus;

				if (
					wpfTextView.Properties.TryGetProperty(
						PropertyNames.DocumentMarkerManager,
						out DocumentMarkerManager documentMarkerManager
					)
					&& documentMarkerManager != null
				)
				{
					documentMarkerManager.Reset();
				}

				textViewMarginProviders.OnSessionLogout();
			}
			catch (Exception ex)
			{
				_log.Error(ex, nameof(OnSessionLogout));
			}
		}

		private Task OnDocumentMarkerChangedAsync(
			IWpfTextView wpfTextView,
			DocumentMarkerChangedEvent e
		)
		{
			return Task.Run(
				async delegate
				{
					await TaskScheduler.Default;
					using (var metrics = _log.WithMetrics(nameof(OnDocumentMarkerChangedAsync)))
					{
						if (
							!wpfTextView.Properties.TryGetProperty(
								PropertyNames.TextViewDocument,
								out IVirtualTextDocument virtualTextDocument
							)
						)
						{
							return;
						}

						var fileUri = virtualTextDocument.Uri;
						try
						{
							if (e.Uri.EqualsIgnoreCase(fileUri))
							{
								metrics.Log($"{nameof(DocumentMarkerChangedEvent)} for {fileUri}");
								using (metrics.Measure("TrySetMarkers"))
								{
									// ReSharper disable once PossibleNullReferenceException
									await wpfTextView.Properties
										?.GetProperty<DocumentMarkerManager>(
											PropertyNames.DocumentMarkerManager
										)
										?.TrySetMarkersAsync();
								}

								using (metrics.Measure("OnMarkerChanged"))
								{
									wpfTextView.Properties
										?.GetProperty<List<ICodeStreamWpfTextViewMargin>>(
											PropertyNames.TextViewMarginProviders
										)
										.OnMarkerChanged();
								}
							}
							else
							{
								_log.Verbose(
									$"{nameof(DocumentMarkerChangedEvent)} ignored for {fileUri}"
								);
							}
						}
						catch (Exception ex)
						{
							_log.Warning(ex, $"{nameof(DocumentMarkerChangedEvent)} for {fileUri}");
						}
					}
				}
			);
		}

		private void TextView_GotAggregateFocus(object sender, EventArgs e)
		{
			if (!(sender is IWpfTextView wpfTextView))
			{
				return;
			}

			if (_focusedWpfTextView != null && _focusedWpfTextView == wpfTextView)
			{
				return;
			}

			ChangeActiveEditor(wpfTextView);
			_focusedWpfTextView = wpfTextView;

			if (
				wpfTextView.Properties.TryGetProperty(
					PropertyNames.TextViewDocument,
					out IVirtualTextDocument virtualTextDocument
				)
			)
			{
				SessionService.LastActiveFileUri = virtualTextDocument.Uri;
			}
		}

		private void OnTextViewLayoutChanged(object sender, TextViewLayoutChangedEventArgs e)
		{
			try
			{
				if (!(sender is IWpfTextView wpfTextView) || !SessionService.IsReady)
				{
					return;
				}

				if (wpfTextView.InLayout || wpfTextView.IsClosed)
				{
					return;
				}

				// don't trigger for changes that don't result in lines being added or removed
				var triggerTextViewLayoutChanged =
					(
						e.VerticalTranslation
						|| Math.Abs(e.NewViewState.ViewportTop - e.OldViewState.ViewportTop) > 0
						|| Math.Abs(e.NewViewState.ViewportBottom - e.OldViewState.ViewportBottom)
							> 0
					) && SessionService.IsWebViewVisible;

				var requiresMarkerCheck = false;
				if (
					wpfTextView.Properties.TryGetProperty(
						PropertyNames.DocumentMarkerManager,
						out DocumentMarkerManager documentMarkerManager
					)
					&& documentMarkerManager != null
				)
				{
					var hasTranslatedLines = e.TranslatedLines.Any();
					var hasNewOrReformattedLines = e.NewOrReformattedLines.Any();

					// get markers if it's null (first time) or we did something that isn't scrolling/vertical changes
					// backspace has a NewOrReformatted Count of 1 :)
					// ENTER-ing beyond the viewport results in e.VerticalTranslation && hasNewOrReformattedLines
					if (
						(e.VerticalTranslation && hasNewOrReformattedLines)
						|| (
							hasTranslatedLines
							&& hasNewOrReformattedLines
							&& e.NewOrReformattedLines.Any()
						)
						|| !documentMarkerManager.IsInitialized()
					)
					{
						requiresMarkerCheck = true;
					}
					else if (
						(e.VerticalTranslation || hasTranslatedLines)
						&& documentMarkerManager.HasMarkers()
					)
					{
						triggerTextViewLayoutChanged = true;
					}
				}

				if (triggerTextViewLayoutChanged || requiresMarkerCheck)
				{
					try
					{
						wpfTextView.Properties
							.GetProperty<Subject<TextViewLayoutChangedSubject>>(
								PropertyNames.TextViewLayoutChangedSubject
							)
							?.OnNext(
								new TextViewLayoutChangedSubject(wpfTextView, sender, e)
								{
									RequiresMarkerCheck = requiresMarkerCheck,
									TriggerTextViewLayoutChanged = triggerTextViewLayoutChanged
								}
							);
					}
					catch (InvalidOperationException ex)
					{
						_log.Error(ex, nameof(OnTextViewLayoutChanged));
					}
				}
			}
			catch (Exception ex)
			{
				_log.Warning(ex, nameof(OnTextViewLayoutChanged));
			}
		}

		private async Task OnTextViewLayoutChangedSubjectHandlerAsync(
			TextViewLayoutChangedSubject subject
		)
		{
			try
			{
				var canTrigger = false;
				IWpfTextView wpfTextView;
				IVirtualTextDocument virtualTextDocument;
				using (_ = _log.WithMetrics(nameof(OnTextViewLayoutChangedSubjectHandlerAsync)))
				{
					Debug.WriteLine(
						$"{nameof(OnTextViewLayoutChangedSubjectHandlerAsync)} RequiresMarkerCheck={subject.RequiresMarkerCheck} TriggerTextViewLayoutChanged={subject.TriggerTextViewLayoutChanged}"
					);
					wpfTextView = subject.WpfTextView;

					if (
						wpfTextView.Properties.TryGetProperty(
							PropertyNames.TextViewDocument,
							out virtualTextDocument
						)
					)
					{
						// don't trigger for changes that don't result in lines being added or removed

						if (
							wpfTextView.Properties.TryGetProperty(
								PropertyNames.DocumentMarkerManager,
								out DocumentMarkerManager documentMarkerManager
							)
							&& documentMarkerManager != null
						)
						{
							// get markers if it's null (first time) or we did something that isn't scrolling/vertical changes
							if (subject.RequiresMarkerCheck)
							{
								var updated = await documentMarkerManager.TrySetMarkersAsync();
								if (updated)
								{
									subject.TriggerTextViewLayoutChanged = true;
								}
							}
						}
						if (subject.TriggerTextViewLayoutChanged)
						{
							//only send this if we have an actual change
							try
							{
								if (wpfTextView.InLayout || wpfTextView.IsClosed)
								{
									return;
								}

								canTrigger = true;
							}
							catch (InvalidOperationException ex)
							{
								_log.Warning(
									ex,
									nameof(OnTextViewLayoutChangedSubjectHandlerAsync)
								);
							}
							catch (Exception ex)
							{
								_log.Error(ex, nameof(OnTextViewLayoutChangedSubjectHandlerAsync));
							}
						}
					}
				}
				if (canTrigger && virtualTextDocument.SupportsMargins)
				{
					_ = TriggerMarginOnTextViewLayoutChangedAsync(subject, wpfTextView);
				}
			}
			catch (Exception ex)
			{
				_log.Warning(ex, nameof(OnTextViewLayoutChanged));
			}

			await Task.CompletedTask;
		}

		private async Task TriggerMarginOnTextViewLayoutChangedAsync(
			TextViewLayoutChangedSubject subject,
			IWpfTextView wpfTextView
		)
		{
			try
			{
				using (_ = _log.WithMetrics(nameof(TriggerMarginOnTextViewLayoutChangedAsync)))
				{
					await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
					wpfTextView.Properties
						.GetProperty<List<ICodeStreamWpfTextViewMargin>>(
							PropertyNames.TextViewMarginProviders
						)
						.OnTextViewLayoutChanged(subject.Sender, subject.EventArgs);
				}
			}
			catch (Exception ex)
			{
				_log.Warning(ex, nameof(TriggerMarginOnTextViewLayoutChangedAsync));
			}

			await Task.CompletedTask;
		}

		private class TextViewState
		{
			public bool Initialized { get; set; }
		}

		internal class TextViewLayoutChangedSubject
		{
			public TextViewLayoutChangedSubject(
				IWpfTextView wpfTextView,
				object sender,
				TextViewLayoutChangedEventArgs e
			)
			{
				WpfTextView = wpfTextView;
				Sender = sender;
				EventArgs = e;
			}

			public IWpfTextView WpfTextView { get; }
			public object Sender { get; }
			public TextViewLayoutChangedEventArgs EventArgs { get; }
			public bool RequiresMarkerCheck { get; set; }
			public bool TriggerTextViewLayoutChanged { get; set; }
		}
	}
}
