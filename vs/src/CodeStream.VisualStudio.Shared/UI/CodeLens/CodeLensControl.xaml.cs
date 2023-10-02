using System.Windows.Controls;

using CodeStream.VisualStudio.Core.Logging;

using Serilog;

namespace CodeStream.VisualStudio.Shared.UI.CodeLens
{
	/// <summary>
	/// Interaction logic for CodeLensControl.xaml
	/// </summary>
	public partial class CodeLensControl : UserControl
	{
		private static readonly ILogger Log = LogManager.ForContext<CodeLensControl>();

		public CodeLensControl()
		{
			InitializeComponent();
		}
	}
}
