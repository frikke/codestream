﻿using CodeStream.VisualStudio.Core.Extensions;
using CodeStream.VisualStudio.Core.Logging;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Serilog;
using System;
using System.Collections.Generic;
using System.ComponentModel.Design;
using System.Runtime.InteropServices;
using System.Threading;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Shared.Commands;
using CodeStream.VisualStudio.Shared.Services;
using CodeStream.VisualStudio.Shared.UI;
using Task = System.Threading.Tasks.Task;
using CodeStream.VisualStudio.Vsix.x64;

namespace CodeStream.VisualStudio.Shared.Packages
{
	/// <summary>
	/// Pseudo-package to allow for a custom service provider
	/// </summary>
	[ProvideService(typeof(SToolWindowProvider))]
	[ProvideMenuResource("Menus.ctmenu", 1)]
	[PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
	[Guid(PackageGuids.guidCodeStreamPackageString)]
	[ProvideAutoLoad(Guids.ServiceProviderPackageAutoLoadId, PackageAutoLoadFlags.BackgroundLoad)]
	// ReSharper disable once RedundantExtendsListEntry
	public sealed class CommandsPackage
		: AsyncPackage,
			IServiceContainer,
			IToolWindowProvider,
			SToolWindowProvider
	{
		private static readonly ILogger Log = LogManager.ForContext<CommandsPackage>();

		private IComponentModel _componentModel;
		private ISessionService _sessionService;
		private ICodeStreamSettingsManager _codeStreamSettingsManager;
		private List<IDisposable> _disposables;
		private List<VsCommandBase> _commands;
		private IIdeService _ideService;

		protected override async Task InitializeAsync(
			CancellationToken cancellationToken,
			IProgress<ServiceProgressData> progress
		)
		{
			try
			{
				await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);

				((IServiceContainer)this).AddService(
					typeof(SToolWindowProvider),
					CreateService,
					true
				);

				_componentModel = await GetServiceAsync(typeof(SComponentModel)) as IComponentModel;
				_sessionService = _componentModel.GetService<ISessionService>();
				_ideService = _componentModel.GetService<IIdeService>();

				var settingsServiceFactory = _componentModel?.GetService<ISettingsServiceFactory>();
				_codeStreamSettingsManager = settingsServiceFactory.GetOrCreate(
					nameof(CommandsPackage)
				);

				AsyncPackageHelper.InitializeLogging(
					_codeStreamSettingsManager.GetExtensionTraceLevel()
				);
				AsyncPackageHelper.InitializePackage(GetType().Name);

				await base.InitializeAsync(cancellationToken, progress);

				await JoinableTaskFactory.RunAsync(
					VsTaskRunContext.UIThreadNormalPriority,
					InitializeCommandsAsync
				);
				Log.Debug($"{nameof(CommandsPackage)} {nameof(InitializeAsync)} completed");
			}
			catch (Exception ex)
			{
				Log.Fatal(ex, nameof(InitializeAsync));
			}
		}

		private async Task InitializeCommandsAsync()
		{
			try
			{
				using (Log.WithMetrics(nameof(InitializeCommandsAsync)))
				{
					_commands = new List<VsCommandBase>
					{
						new WebViewReloadCommand(_sessionService),
						new WebViewToggleCommand(),
						new AuthenticationCommand(_componentModel, _sessionService)
					};
					await JoinableTaskFactory.SwitchToMainThreadAsync();
					await InfoBarProvider.InitializeAsync(this);

					var menuCommandService = (IMenuCommandService)(
						await GetServiceAsync(typeof(IMenuCommandService))
					);
					foreach (var command in _commands)
					{
						menuCommandService.AddCommand(command);
					}
				}
			}
			catch (Exception ex)
			{
				Log.Error(ex, nameof(InitializeCommandsAsync));
			}
		}

		private object CreateService(IServiceContainer container, Type serviceType)
		{
			if (typeof(SToolWindowProvider) == serviceType)
				return this;

			return null;
		}

		private static bool TryGetWindowFrame(Guid toolWindowId, out IVsWindowFrame frame)
		{
			ThreadHelper.ThrowIfNotOnUIThread();

			var shell = GetGlobalService(typeof(SVsUIShell)) as IVsUIShell;
			if (
				shell == null
				|| ErrorHandler.Failed(
					shell.FindToolWindow(
						(uint)__VSCREATETOOLWIN.CTW_fForceCreate,
						ref toolWindowId,
						out frame
					)
				)
			)
			{
				frame = null;
				return false;
			}

			return true;
		}

		/// <summary>
		/// Returns true if the ToolWindow is visible
		/// </summary>
		/// <param name="toolWindowId"></param>
		/// <returns>true if visible</returns>
		/// <remarks>
		/// IVsWindowFrame.IsOnScreen checks to see if a window hosted by the Visual Studio IDE has
		/// been autohidden, or if the window is part of a tabbed display and currently obscured by
		/// another tab. IsOnScreen also checks to see whether the instance of the Visual Studio IDE
		/// is minimized or obscured. IsOnScreen differs from the behavior of IsWindowVisible a
		/// method that may return true even if the window is completely obscured or minimized.
		/// IsOnScreen also differs from IsVisible which does not check to see if the Visual Studio
		/// IDE has autohidden the window, or if the window is tabbed and currently obscured by
		/// another window.
		/// </remarks>
		public bool IsVisible(Guid toolWindowId)
		{
			ThreadHelper.ThrowIfNotOnUIThread();

			if (!TryGetWindowFrame(toolWindowId, out IVsWindowFrame frame))
			{
				return false;
			}

			if (frame.IsOnScreen(out int pfOnScreen) == VSConstants.S_OK)
			{
				return pfOnScreen == 1;
			}

			return false;
		}

		/// <summary>
		/// Shows the tool window
		/// </summary>
		/// <param name="toolWindowId">the guid of the window</param>
		/// <returns>true if it is about to show the frame</returns>
		public bool ShowToolWindowSafe(Guid toolWindowId)
		{
			try
			{
				ThreadHelper.ThrowIfNotOnUIThread();

				if (!TryGetWindowFrame(toolWindowId, out IVsWindowFrame frame))
					return false;

				frame.Show();
				return true;
			}
			catch (Exception)
			{
				//suffer
			}

			return false;
		}

		public bool? ToggleToolWindowVisibility(Guid toolWindowId)
		{
			ThreadHelper.ThrowIfNotOnUIThread();

			if (TryGetWindowFrame(toolWindowId, out IVsWindowFrame frame))
			{
				if (frame.IsVisible() == VSConstants.S_OK)
				{
					frame.Hide();
					return false;
				}
				else
				{
					frame.Show();
					return true;
				}
			}

			return null;
		}

		protected override void Dispose(bool isDisposing)
		{
			if (isDisposing)
			{
				try
				{
#pragma warning disable VSTHRD108
					ThreadHelper.ThrowIfNotOnUIThread();
#pragma warning restore VSTHRD108

					_disposables.DisposeAll();
				}
				catch (Exception ex)
				{
					Log.Error(ex, nameof(Dispose));
				}
			}

			base.Dispose(isDisposing);
		}
	}
}
