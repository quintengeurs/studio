import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  url: string;
  alt: string;
  category: string;
};

export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;
