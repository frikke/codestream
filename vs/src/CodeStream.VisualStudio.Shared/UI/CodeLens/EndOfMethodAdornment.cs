using System;
using System.ComponentModel.Composition;
using System.Linq;
using System.Windows.Controls;
using System.Windows.Forms;
using System.Windows.Media;

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Utilities;

namespace CodeStream.VisualStudio.Shared.UI.CodeLens
{
	[Export(typeof(IWpfTextViewCreationListener))]
	[ContentType("code")]
	[TextViewRole(PredefinedTextViewRoles.Document)]
	internal sealed class MethodAdornmentTextViewCreationListener : IWpfTextViewCreationListener
	{
		[Export]
		[Name("EndOfMethodAdornmentLayer")]
		[Order(After = PredefinedAdornmentLayers.Text)]
		public AdornmentLayerDefinition AdornmentLayer { get; } = new AdornmentLayerDefinition();

		public void TextViewCreated(IWpfTextView textView)
		{
			textView.LayoutChanged += TextView_LayoutChanged;
		}

		private void TextView_LayoutChanged(object sender, TextViewLayoutChangedEventArgs e)
		{
			var textView = sender as IWpfTextView;
			var snapshot = textView.TextSnapshot;
			var text = snapshot.GetText();
			var tree = CSharpSyntaxTree.ParseText(text);
			var root = tree.GetRoot();
			var adornmentLayer = textView.GetAdornmentLayer("EndOfMethodAdornmentLayer");
			adornmentLayer.RemoveAllAdornments();

			foreach (
				var methodDeclaration in root.DescendantNodes().OfType<MethodDeclarationSyntax>()
			)
			{
				var methodNamePosition = methodDeclaration.Identifier.Span.End;
				var adornment = new TextBlock
				{
					Text = "avg duration 4.99ms | error rate 3.4",
					Foreground = Brushes.Red
				};

				var lineView = textView.GetTextViewLineContainingBufferPosition(
					new SnapshotPoint(snapshot, methodNamePosition)
				);
				if (lineView != null)
				{
					var bounds = lineView.GetCharacterBounds(
						new SnapshotPoint(snapshot, methodNamePosition)
					);
					Canvas.SetLeft(adornment, bounds.Right + 10);
					Canvas.SetTop(adornment, bounds.TextTop);

					adornmentLayer.AddAdornment(
						AdornmentPositioningBehavior.TextRelative,
						new SnapshotSpan(snapshot, methodNamePosition, 0),
						null,
						adornment,
						null
					);
				}
			}
		}
	}
}
