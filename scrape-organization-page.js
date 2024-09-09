// External Dependencies
import * as cheerio from 'cheerio';
import axios from 'axios';
import fs from 'fs';
import { gotScraping } from 'got-scraping';

// Relative Dependencies
import { getSmartProxyAgent, getSmartProxyUrl } from './proxies.js';

export async function scrapeCrunchbasePage(url, retries = 0) {
  const res = await gotScraping({
    url: `http://webcache.googleusercontent.com/search?q=cache:${url}`,
    proxyUrl: getSmartProxyUrl(),
  });

  try {
    const $ = cheerio.load(res.body);
    const companyInfo = {
      logo_url: '',
    };

    const companyName = $('h1.profile-name').text().trim();
    const companyDescription = $('span.description.ng-star-inserted')
      .text()
      .trim();
    const profileHeaderLogo = $('profile-header-logo');

    companyInfo['description'] = companyDescription;

    if (profileHeaderLogo.length) {
      const sources = profileHeaderLogo.find('source');

      if (sources.length) {
        const srcset = sources.first().attr('srcset');

        if (srcset) {
          const srcsetArray = srcset.split(' ');
          companyInfo['logo_url'] = srcsetArray[0];
        }
      }
    }

    $('.icon_and_value li').each((index, element) => {
      const value = $(element).text().trim();

      switch (index) {
        case 0:
          companyInfo['location'] = value;
          break;
        case 1:
          if (value.match(/\d+(-\d+)?/)) {
            companyInfo['employee_count'] = value;
          }
          break;
        case 2:
          if (!['private', 'public'].includes(value.toLowerCase())) {
            companyInfo['last_funding_type'] = value;
          }
          break;
        case 3:
          if (['private', 'public'].includes(value.toLowerCase())) {
            companyInfo['company_rype'] = value;
          }
          break;
        case 4:
          if (value.includes('.com') || value.includes('www.')) {
            companyInfo['website'] = value;
          }
          break;
      }
    });

    if (Object.keys(companyInfo).length === 7) {
      return {
        [companyName]: companyInfo,
      };
    } else {
      return null;
    }
  } catch (error) {
    if (retries < 5) {
      return scrapeCrunchbasePage(url, retries + 1);
    }
    console.log('error at scrapeCrunchbasePage', error.message);
    throw error;
  }
}

const getCrunchbaseData = async () => {
  const allUrls = fs.readFileSync(
    './crunchbase-data/crunchbase-filtered-company-list4.txt',
    'utf-8'
  );
  const crunchbasePageUrls = allUrls
    .split('\n')
    .filter((url) => url.trim() !== '');

  let batch = [];

  const resultsList = [];

  for (let i = 0; i < crunchbasePageUrls.length; i++) {
    console.log('i', i);
    batch.push(scrapeCrunchbasePage(crunchbasePageUrls[i]));
    if (batch.length === 100 || i === crunchbasePageUrls.length - 1) {
      const results = await Promise.all(batch);
      results.forEach((result) => {
        if (result !== null) {
          resultsList.push(result);
        }
      });
      batch = [];
    }
  }

  const reducedResult = resultsList.reduce((acc, item) => {
    if (item !== null) {
      const [key, value] = Object.entries(item)[0];
      acc[key] = value;
    }
    return acc;
  }, {});
  fs.writeFileSync(
    'crunchbase-data.json',
    JSON.stringify(reducedResult, null, 2)
  );
};

(async () => {
  await getCrunchbaseData();
})();
