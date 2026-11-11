/** Short, plain legal pages. Drafts for review before the store listing: replace with the lawyer's text. */
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { config } from '@/config';
import { space } from '@/theme';
import { Screen, Text } from '@/ui';

const docs: Record<string, { title: string; body: string[] }> = {
  privacy: {
    title: 'الخصوصية',
    body: [
      'نطلب فقط ما نحتاجه لتجهيز طلبك وتوصيله: الاسم، الجوال، العنوان، وما تريد كتابته على القطع.',
      'بيانات البطاقة تُرسل مباشرة إلى بوابة الدفع ميسّر، ولا نحفظها ولا تمرّ بخوادمنا.',
      'السلة والاسم والعنوان محفوظة على جهازك. تُحذف بحذف التطبيق.',
      'في المجتمع لا نحفظ بريد عملك. نحفظ بصمة مشفّرة منه لا يمكن عكسها، واسم جهة العمل.',
      'لا نبيع بياناتك ولا نشاركها إلا مع شركة الشحن وبوابة الدفع بقدر الحاجة.',
      `لطلب نسخة من بياناتك أو حذفها: ${config.supportEmail}`,
    ],
  },
  terms: {
    title: 'الشروط والاسترجاع',
    body: [
      'الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة.',
      'القطع التي يُكتب عليها اسم تُصنع لك خصيصاً، فلا تُسترجع إلا إذا وصلت معيبة أو بخطأ منا.',
      'القطع بلا اسم تُسترجع خلال 7 أيام من الاستلام وهي بحالتها.',
      'راجع الاسم قبل الدفع. نكتبه كما كتبته.',
      `لأي مشكلة في طلبك: ${config.supportEmail}`,
    ],
  },
};

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const d = docs[doc] ?? docs.terms;
  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={{ gap: space[5], paddingTop: space[4] }}>
        <Text variant="display" accessibilityRole="header">{d.title}</Text>
        {d.body.map((t) => <Text key={t} variant="body">{t}</Text>)}
      </View>
    </Screen>
  );
}
