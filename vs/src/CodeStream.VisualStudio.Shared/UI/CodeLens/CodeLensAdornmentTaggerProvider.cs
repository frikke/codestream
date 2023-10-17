using System;

using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Tagging;
using Microsoft.VisualStudio.Utilities;
using Microsoft.VisualStudio.Text.Internal;
using System.ComponentModel.Composition;

namespace CodeStream.VisualStudio.Shared.UI.CodeLens
{
	[Export(typeof(IViewTaggerProvider))]
	[TagType(typeof(InterLineAdornmentTag))]
	[ContentType("code")]
	internal sealed class CodeLensAdornmentTaggerProvider : IViewTaggerProvider
	{
		[Import]
		internal IBufferTagAggregatorFactoryService BufferTagAggregatorFactoryService { get; set; }

		public ITagger<T> CreateTagger<T>(ITextView textView, ITextBuffer buffer)
			where T : ITag
		{
			if (buffer != textView.TextBuffer || !(textView is IWpfTextView wpfTextView))
			{
				return null;
			}

			if (textView == null)
			{
				throw new ArgumentNullException(nameof(textView));
			}

			if (buffer == null)
			{
				throw new ArgumentNullException(nameof(buffer));
			}

			if (buffer != textView.TextBuffer)
			{
				return null;
			}

			return new CodeLensAdornmentTagger(
					wpfTextView,
					BufferTagAggregatorFactoryService.CreateTagAggregator<InterLineAdornmentTag>(
						buffer
					)
				) as ITagger<T>;
		}
	}
}
