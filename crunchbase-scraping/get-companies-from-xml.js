// External Dependencies
import fs from 'fs/promises';
import path from 'path';
import xml2js from 'xml2js';

const parser = new xml2js.Parser();

async function extractLocFromXml(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const result = await parser.parseStringPromise(data);

    // Assuming the structure is always urlset > url > loc
    const locations = result.urlset.url.map((url) => url.loc[0]);
    return locations;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return [];
  }
}

async function processXmlFiles(folderPath) {
  try {
    const files = await fs.readdir(folderPath);
    const xmlFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === '.xml'
    );

    for (const file of xmlFiles) {
      const filePath = path.join(folderPath, file);
      const locations = await extractLocFromXml(filePath);

      console.log(`Locations from ${file}:`);
      locations.forEach((loc) => console.log(loc));
      console.log('---');
    }
  } catch (error) {
    console.error('Error reading folder:', error);
  }
}

processXmlFiles('./downloaded_sitemaps');
