using System.Collections.Generic;
using System.Linq;

using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Tagging;
using System;
using System.ComponentModel.Composition;
using System.Windows;

using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text.Formatting;
using Microsoft.VisualStudio.Utilities;

namespace CodeStream.VisualStudio.Shared.UI.CodeLens
{
	internal sealed class CodeLensAdornmentTagger : ITagger<IntraTextAdornmentTag>
	{
		private IWpfTextView _view;
		private ITagAggregator<ICodeLensTag> _tagAggregator;
		private List<UIElement> _adornments;
		private IAdornmentLayer _adornmentLayer;

		[Export]
		[Name("CodeLensAdornmentLayer")]
		[Order(
			After = PredefinedAdornmentLayers.Text,
			Before = PredefinedAdornmentLayers.Selection
		)]
		public AdornmentLayerDefinition AdornmentLayer { get; } = new AdornmentLayerDefinition();

		internal CodeLensAdornmentTagger(
			IWpfTextView view,
			ITagAggregator<ICodeLensTag> tagAggregator
		)
		{
			_view = view;
			_tagAggregator = tagAggregator;

			_adornments = new List<UIElement>();

			_adornmentLayer = view.GetAdornmentLayer("CodeLensAdornmentLayer");
			_view.LayoutChanged += OnLayoutChanged;
		}

		public event EventHandler<SnapshotSpanEventArgs> TagsChanged;

		private void OnLayoutChanged(object sender, TextViewLayoutChangedEventArgs e)
		{
			// Remove any adornments
			_adornments.RemoveAll(x => true);

			// Add adornments to the view
			foreach (
				var tagSpan in GetTags(
					new NormalizedSnapshotSpanCollection(e.NewSnapshot, e.NewOrReformattedSpans)
				)
			)
			{
				var adornment = tagSpan.Tag.Adornment;

				if (_adornments.Contains(adornment))
				{
					continue;
				}

				_adornments.Add(adornment);

				_adornmentLayer.AddAdornment(
					AdornmentPositioningBehavior.TextRelative,
					tagSpan.Span,
					null,
					adornment,
					null
				);
			}
		}

		public IEnumerable<ITagSpan<IntraTextAdornmentTag>> GetTags(
			NormalizedSnapshotSpanCollection spans
		)
		{
			if (spans.Count == 0)
			{
				yield break;
			}

			var snapshot = spans[0].Snapshot;

			// Parse the document to get the syntax tree
			var text = snapshot.GetText();
			var tree = CSharpSyntaxTree.ParseText(text);
			var root = tree.GetCompilationUnitRoot();

			// Find all method declarations in the syntax tree
			var methodDeclarations = root.DescendantNodes()
				.OfType<ClassDeclarationSyntax>()
				.SelectMany(x => x.ChildNodes().OfType<MethodDeclarationSyntax>());

			foreach (var methodDeclaration in methodDeclarations)
			{
				// Get the method's identifier token
				var identifierToken = methodDeclaration.Identifier;

				// Get the position of the method's identifier token in the snapshot
				var methodPosition = identifierToken.SpanStart;

				var adornmentControl = new CodeLensControl();

				// Create the IntraTextAdornmentTag
				var adornmentTag = new IntraTextAdornmentTag(
					adornmentControl,
					null,
					PositionAffinity.Successor
				);

				// Create the adornment's SnapshotSpan
				var adornmentSpan = new SnapshotSpan(snapshot, methodPosition, 0);

				// Create and yield the TagSpan
				yield return new TagSpan<IntraTextAdornmentTag>(adornmentSpan, adornmentTag);
			}
		}
	}
}
