export async function createEmbeddingFromVideo(video) {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const buckets = new Array(128).fill(0);

  for (let index = 0; index < data.length; index += 4) {
    const pixel = index / 4;
    const luminance = (data[index] + data[index + 1] + data[index + 2]) / 3 / 255;
    buckets[pixel % buckets.length] += luminance;
  }

  const magnitude = Math.sqrt(buckets.reduce((total, value) => total + value ** 2, 0)) || 1;
  return buckets.map((value) => Number((value / magnitude).toFixed(6)));
}
