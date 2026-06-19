import { Shield, Heart, Map, Headphones } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Shield,
    title: "امنیت و اطمینان",
    description: "تمامی کاروان‌ها دارای مجوز رسمی از سازمان حج و زیارت هستند.",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    icon: Heart,
    title: "خدمات ویژه",
    description: "ارائه خدمات اسکان، تغذیه و حمل و نقل با کیفیت برای زائرین.",
    color: "from-rose-500 to-pink-600",
    bg: "bg-rose-50",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
  },
  {
    icon: Map,
    title: "تنوع مسیرها",
    description: "انتخاب از میان مسیرهای زمینی، هوایی و ترکیبی برای سفر.",
    color: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    icon: Headphones,
    title: "پشتیبانی ۲۴ ساعته",
    description: "ارتباط با کارشناسان ما در تمام مراحل ثبت‌نام و سفر.",
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function Features() {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <span className="inline-block bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            چرا ما؟
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            چرا سامانه رزرو کاروان کربلا؟
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            با هزاران زائر راضی، بهترین تجربه سفر زیارتی را برای شما فراهم می‌کنیم.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              whileHover={{ y: -8, boxShadow: "0 24px 48px rgba(0,0,0,0.12)" }}
              className={`${feature.bg} p-8 rounded-2xl border border-white shadow-sm cursor-default transition-colors duration-300 group`}
            >
              <div
                className={`w-14 h-14 ${feature.iconBg} ${feature.iconColor} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-gray-800">{feature.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              <div className={`mt-4 h-0.5 w-12 bg-gradient-to-r ${feature.color} rounded-full group-hover:w-20 transition-all duration-500`} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
