import { PageConfig, URLExt } from '@jupyterlab/coreutils';

import { JSONObject } from '@lumino/coreutils';

/**
 * A class to handle requests to /api/translations
 */
export class Translation {
  /**
   * Get the translation data for the given locale
   * @param locale The locale
   * @returns
   */
  async get(locale: string): Promise<JSONObject> {
    const apiURL = URLExt.join(
      PageConfig.getBaseUrl(),
      `api/translations/${locale}.json`
    );
    const response = await fetch(apiURL);
    const json = JSON.parse(await response.text());
    return json;
  }
}