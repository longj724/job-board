import { createObjectCsvWriter } from 'csv-writer';
import csv from 'csv-parser';
import fs from 'graceful-fs';

export async function createCSV(arrayOfData, fileName) {
  try {
    if (!arrayOfData.length) {
      console.log('no data to write for', fileName);
      return;
    }
    const headers = Object.keys(arrayOfData[0]).map((header) => ({
      id: header,
      title: header,
    }));
    console.log('createcsv called');
    const csvWriter = createObjectCsvWriter({
      path: fileName,
      header: headers,
    });
    await csvWriter.writeRecords(arrayOfData);
    console.log('The CSV file was written successfully', fileName);
  } catch (error) {
    console.log('error at createCSV', error);
  }
}

export async function readCSV(fileName) {
  try {
    const results = [];
    const parsed = [];

    console.log('fileName', fileName);
    const parser = fs
      .createReadStream(fileName)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {});

    for await (const record of parser) {
      // Work with each record
      parsed.push(record);
    }
    return parsed;
  } catch (error) {
    console.log('error at readCSV', error);
  }
}
