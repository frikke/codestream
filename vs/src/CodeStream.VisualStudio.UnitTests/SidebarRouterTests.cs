﻿using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Models;

using Moq;
using Newtonsoft.Json.Linq;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Shared;
using CodeStream.VisualStudio.Shared.Authentication;
using CodeStream.VisualStudio.Shared.Extensions;
using CodeStream.VisualStudio.Shared.Models;
using CodeStream.VisualStudio.Shared.Services;
using Microsoft.VisualStudio.ComponentModelHost;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests
{
	public class SidebarRouterTests
	{
		[Fact]
		public async Task HandleAsyncTest()
		{
			var mockBrowserService = new Mock<IBrowserService>();
			var mockCodeStreamAgentService = new Mock<ICodeStreamAgentService>();
			var mockCodeStreamService = new Mock<ICodeStreamService>();
			var mockWebviewUserSettingsService = new Mock<IWebviewUserSettingsService>();
			var mockSessionService = new Mock<ISessionService>();
			var mockSettingsServiceFactory = new Mock<ISettingsServiceFactory>();
			var mockEventAggregator = new Mock<IEventAggregator>();
			var mockIdeService = new Mock<IIdeService>();
			var mockEditorService = new Mock<IEditorService>();
			var mockAuthenticationServiceFactory = new Mock<IAuthenticationServiceFactory>();
			var mockComponentModel = new Mock<IComponentModel>();
			var mockCredentialManager = new Mock<ICredentialManager>();
			var mockSymbolService = new Mock<ISymbolService>();

			var mockComponentModelObject = mockComponentModel.Object;
			var mockCodeStreamServiceObject = mockCodeStreamService.Object;
			var mockWebviewUserSettingsServiceObject = mockWebviewUserSettingsService.Object;
			var mockSessionServiceObject = mockSessionService.Object;
			var mockSettingsServiceFactoryObject = mockSettingsServiceFactory.Object;
			var mockEventAggregatorObject = mockEventAggregator.Object;
			var mockBrowserServiceObject = mockBrowserService.Object;
			var mockIdeServiceObject = mockIdeService.Object;
			var mockEditorServiceObject = mockEditorService.Object;
			var mockAuthenticationServiceFactoryObject = mockAuthenticationServiceFactory.Object;
			var mockCredentialManagerObject = mockCredentialManager.Object;
			var mockSymbolServiceObject = mockSymbolService.Object;

			var ideServiceMock = new Mock<IIdeService>();

			ideServiceMock.Setup(x => x.GetActiveDiffEditor()).Returns(() => null);

			var messageInterceptor = new MessageInterceptorService(ideServiceMock.Object);

			var mockCodeStreamAgentServiceObject = mockCodeStreamAgentService.Object;

			var router = new SidebarRouter(
				mockComponentModelObject,
				mockCodeStreamServiceObject,
				mockWebviewUserSettingsServiceObject,
				mockSessionServiceObject,
				mockCodeStreamAgentServiceObject,
				mockSettingsServiceFactoryObject,
				mockEventAggregatorObject,
				mockBrowserServiceObject,
				mockIdeServiceObject,
				mockEditorServiceObject,
				mockAuthenticationServiceFactoryObject,
				messageInterceptor,
				mockCredentialManagerObject,
				mockSymbolServiceObject
			);

			await router.HandleAsync(new WindowEventArgs("BOGUS"));

			var message = new WebviewIpcMessage(
				"123",
				ReloadWebviewRequestType.MethodName,
				JToken.Parse("{}"),
				null
			).ToJson();

			await router.HandleAsync(new WindowEventArgs(message));
			mockBrowserService.Verify(_ => _.ReloadWebView(), Times.Once);

			message = new WebviewIpcMessage(
				"123",
				$"{IpcRoutes.Agent}/anything",
				JToken.Parse("{}"),
				null
			).ToJson();

			await router.HandleAsync(new WindowEventArgs(message));
			mockCodeStreamAgentService.Verify(
				_ => _.SendAsync<JToken>(It.IsAny<string>(), It.IsAny<JToken>(), null),
				Times.Once
			);
		}
	}
}
