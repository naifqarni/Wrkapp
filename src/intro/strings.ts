/**
 * Every word of the first-launch intro. Saudi dialect, one line a beat, a little playful, never
 * selling. No names, numbers, years or places: nothing here states a fact about the founders that
 * somebody would have to verify. Edit the lines here and nowhere else.
 */
export const intro = {
  beats: [
    { line: 'يا هلا. حنّا', mark: true },
    { line: 'سعوديين نحب شغلنا، ونحب نسولف عنه.' },
    { line: 'الدوام مو بس دوام. فيه سوالف تستاهل تنقال.' },
    { line: 'فسوّينا مكان للموظفين: اسأل، فضفض، وخذ العلم من أهله.' },
    { line: 'نبي ثقافة الشغل السعودية شي نرفع فيه الراس. حيّاك.' },
  ],
  next: 'التالي',
  enter: 'يلا',
  skip: 'تخطّي',
  /** Read by screen readers in place of the animation. */
  stageLabel: 'بطاقة موظف من wrk.',
  step: (n: number, of: number) => `${n} من ${of}`,
} as const;
