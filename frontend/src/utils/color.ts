export function hashToColor(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i)
    h |= 0 // convert to 32bit int
  }
  const hue = Math.abs(h) % 360
  // use HSL for good-looking distinct colors
  return `hsl(${hue} 70% 55%)`
}
