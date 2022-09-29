using System.IO;

using CodeStream.VisualStudio.Core.Models;

using Xunit;

namespace CodeStream.VisualStudio.UnitTests.Core.Models {
	
	public class DiffExtensionTests {
		[Fact]
		public void IsTempFileTest()
		{
			var tempFile = Path.GetTempFileName();
			Assert.True(DiffExtensions.IsTempFile(tempFile));
		}
	}
}
