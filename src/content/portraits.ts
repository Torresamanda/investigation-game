const images = import.meta.glob<string>(
  '../../assets/{investigators,suspects,authorities}/*.{png,jpg,jpeg,webp,avif}',
  { eager: true, query: '?url', import: 'default' },
)

export function getPortrait(
  folder: 'investigators' | 'suspects' | 'authorities',
  filename: string,
) {
  for (const extension of ['png', 'webp', 'jpg', 'jpeg', 'avif']) {
    const image = images[`../../assets/${folder}/${filename}.${extension}`]
    if (image) return image
  }
  return undefined
}
