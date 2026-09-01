"""
نرمال‌سازی ارقام فارسی/عربی.

قاعده‌ی سامانه: کاربر می‌تواند اعداد را فارسی یا انگلیسی وارد کند و هر دو یکسان
در نظر گرفته می‌شوند. فیلدهای «عددی» پیش از اعتبارسنجی به ارقام لاتین تبدیل
می‌شوند؛ متن‌های آزاد (نام کاروان، توضیحات، تاریخ شمسی نمایشی) دست‌نخورده
می‌مانند تا ظاهرشان عوض نشود.
"""

_DIGIT_MAP = str.maketrans(
    '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩٫',
    '01234567890123456789.',
)


def to_latin_digits(value):
    """ارقام فارسی/عربی یک رشته را به لاتین تبدیل می‌کند."""
    if value is None or not isinstance(value, str):
        return value
    return value.translate(_DIGIT_MAP)


def normalize_number(value):
    """مقدار یک فیلد عددی: ارقام لاتین + حذف جداکننده هزارگان و فاصله."""
    value = to_latin_digits(value)
    if isinstance(value, str):
        value = value.replace(',', '').replace('٬', '').strip()
    return value


class NormalizeDigitsMixin:
    """
    میکسین سریالایزر: فیلدهای نام‌برده‌شده در ``numeric_fields`` پیش از
    اعتبارسنجی به ارقام لاتین تبدیل می‌شوند.
    """

    numeric_fields = ()

    def to_internal_value(self, data):
        if hasattr(data, 'copy'):
            data = data.copy()
            for field in self.numeric_fields:
                if field in data and isinstance(data.get(field), str):
                    data[field] = normalize_number(data[field])
        return super().to_internal_value(data)
