import { useEffect, useState } from "react";
import { Box } from "@mui/material";

type HeroSlideshowProps = {
  images: string[];
};

const kenBurnsTo = [
  "scale(1.08) translate(-1%,-1%)",
  "scale(1.08) translate(1%,-1%)",
  "scale(1.08) translate(-1%,1%)",
  "scale(1.08) translate(1%,1%)",
];

const HeroSlideshow = ({ images }: HeroSlideshowProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);

  useEffect(() => {
    if (images.length <= 1) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((currentIndex) => {
        setPrevIndex(currentIndex);
        return (currentIndex + 1) % images.length;
      });
    }, 6000);

    return () => window.clearInterval(interval);
  }, [images.length]);

  useEffect(() => {
    setActiveIndex(0);
    setPrevIndex(null);
  }, [images]);

  return (
    <Box sx={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      {images.map((image, index) => {
        const variant = index % 4;
        const keyframeName = `kenburns-${variant}`;

        return (
          <Box
            key={image}
            data-previous={index === prevIndex ? "true" : undefined}
            sx={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              willChange: "transform, opacity",
              transform: "translateZ(0)",
              opacity: index === activeIndex ? 1 : 0,
              transition: "opacity 1.5s ease-in-out",
              animation:
                index === activeIndex
                  ? `${keyframeName} 10s ease-in-out forwards`
                  : "none",
              [`@keyframes ${keyframeName}`]: {
                from: { transform: "scale(1) translate(0,0)" },
                to: { transform: kenBurnsTo[variant] },
              },
            }}
          />
        );
      })}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "linear-gradient(to top, rgba(15,20,30,0.75) 0%, rgba(15,20,30,0.35) 50%, rgba(15,20,30,0.15) 100%)",
        }}
      />
    </Box>
  );
};

export default HeroSlideshow;
