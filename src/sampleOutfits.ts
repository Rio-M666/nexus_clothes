const images = import.meta.env.BASE_URL + 'images/'

export const sampleOutfits = [
  { id: 'denim', name: 'デニム' },
  { id: 'slacks', name: '黒スラックス' },
  { id: 'chinos', name: 'ベージュチノ' },
].map(({ id, name }) => ({
  id,
  name,
  originalUrl: images + 'bottom-' + id + '.jpg',
  resultUrl: images + 'look-' + id + '.jpg',
}))

export type SampleOutfit = typeof sampleOutfits[number]
export const sampleShirt = images + 'shirt.jpg'
