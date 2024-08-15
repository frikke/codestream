import AdmZip from "adm-zip";

export async function archiveFolder(folder: string, destinationZip: string) {
	try {
		const zip = new AdmZip();
		zip.addLocalFolder(folder);
		zip.writeZip(destinationZip);
	} catch (e) {
		throw new Error(`Failed to archive ${folder} to ${destinationZip}: ${e}`);
	}
}
