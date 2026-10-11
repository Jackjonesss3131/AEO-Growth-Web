// Layer 4 (Expression): "what does ChatGPT answer about this company?"
//
// NOT IMPLEMENTED YET. This file is the extension point; batch-audit.js only loads it when
// you pass --include-answers. To build it, fill in run() and summarize() and set
// implemented = true. Nothing else in the batch script has to change:
//   - run() gets the domain, company name, the other two reports and a fetch with retries
//     and error logging (same wrapper the checks use). Read API keys from process.env here.
//   - Its return value is stored in full under "answers" in results.json.
//   - summarize() turns it into the text of the "ai_answers" column in results.csv.
// If run() throws, the error goes to that domain's row and the batch keeps going.

export const answersModule = {
  name: 'answers',
  column: 'ai_answers',
  implemented: false,

  /**
   * @param {{ domain: string, companyName: string, crawler: object, positioning: object,
   *           fetch: (url: string, init?: RequestInit) => Promise<Response>, signal: AbortSignal }} ctx
   * @returns {Promise<object>}
   */
  async run(ctx) {
    void ctx;
    throw new Error('answers module not implemented yet (scripts/lib/answers.js)');
  },

  /** @param {object} result value returned by run() */
  summarize(result) {
    void result;
    return '';
  },
};
