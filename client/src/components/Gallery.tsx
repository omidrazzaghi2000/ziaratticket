import { motion } from "framer-motion";

import img1 from "../assets/images/hasanmajed__-E0RryWDcsWw-unsplash.jpg";
import img2 from "../assets/images/pexels-samer-alhusseini-540227434-17340981.jpg";
import img3 from "../assets/images/pexels-samer-alhusseini-540227434-18848803.jpg";
import img4 from "../assets/images/benyamin-bohlouli-k_Z_5G65DV4-unsplash.jpg";
import img5 from "../assets/images/mhrezaa-IzzJeU6I7FI-unsplash.jpg";
import img6 from "../assets/images/mahdi-b7gjIMzLJZc-unsplash.jpg";

interface GalleryItemData {
  src: string;
  alt: string;
  caption: string;
}

const galleryItems: GalleryItemData[] = [
  { src: img1, alt: "گنبد طلایی حرم امام حسین در غروب", caption: "غروب کربلا" },
  { src: img2, alt: "مناره‌های حرم در شب", caption: "شب‌های نورانی" },
  { src: img3, alt: "سه مناره طلایی در آسمان آبی", caption: "مناره‌های حرم" },
  { src: img4, alt: "زائران در محوطه حرم", caption: "زائران عزیز" },
  { src: img5, alt: "نمای نزدیک مناره طلایی", caption: "معماری بی‌نظیر" },
  { src: img6, alt: "داخل حرم با جمعیت زائران", caption: "معنویت ناب" },
];

function GalleryItem({
  item, delay, className, aspectRatio,
}: { item: GalleryItemData; delay: number; className: string; aspectRatio: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.015, transition: { duration: 0.35 } }}
      className={`group relative overflow-hidden rounded-2xl ${aspectRatio} ${className}`}
    >
      <img
        src={item.src}
        alt={item.alt}
        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-350">
        <span className="inline-block bg-black/40 backdrop-blur-sm text-white font-heading text-sm font-bold px-3 py-1 rounded-full">
          {item.caption}
        </span>
      </div>
      <div className="absolute inset-0 rounded-2xl ring-2 ring-gold-400/0 group-hover:ring-gold-400/35 transition-all duration-400" />
    </motion.div>
  );
}

export default function Gallery() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-cream-200 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <span className="inline-flex items-center gap-2 bg-primary/8 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-5 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
            تصاویر زیارتگاه
          </span>
          <h2 className="font-heading text-display-sm text-foreground mb-4">کربلای معلی</h2>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold-400/60" />
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6Z" fill="hsl(42 60% 52%)" opacity="0.8" />
            </svg>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold-400/60" />
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            نگاهی به زیبایی و معنویت حرم مطهر امام حسین (ع) در کربلای معلی
          </p>
        </motion.div>

        {/* Gallery grid — editorial layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {/* Row 1: Feature (2-col wide) + 1 tall */}
          {galleryItems.slice(0, 3).map((item, i) => (
            <GalleryItem
              key={i}
              item={item}
              delay={i * 0.08}
              className={i === 0 ? "md:col-span-2" : "row-span-2"}
              aspectRatio={i === 0 ? "aspect-[16/9]" : "aspect-[3/5]"}
            />
          ))}

          {/* Row 2: 3 equal cards */}
          {galleryItems.slice(3).map((item, i) => (
            <GalleryItem
              key={i + 3}
              item={item}
              delay={(i + 3) * 0.08}
              className=""
              aspectRatio="aspect-[4/3]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
