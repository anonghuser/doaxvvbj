"use strict"
async function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image
    image.src = url
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('loadImage failed to load.'))
  })
}

async function crop(img, x, y, w, h, deg, scale = 2) {
  console.log(w, h)
  const c = new OffscreenCanvas(w * scale, h * scale)
  const ctx = c.getContext('2d')
  //ctx.imageSmoothingEnabled = 0
  ctx.rotate(deg * Math.PI / 180)
  ctx.scale(scale, scale)
  ctx.translate(-x, -y)
  ctx.drawImage(img, 0, 0)
  ctx.resetTransform()
  return loadImage(URL.createObjectURL(await c.convertToBlob()))
}

async function recolor(image) {
  const c = new OffscreenCanvas(image.naturalWidth, image.naturalHeight)
  const ctx = c.getContext('2d')
  ctx.drawImage(image, 0, 0)
  const data = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
  let count = 0
  console.log(data.data.length)
  for (let idx=0; idx < data.data.length; idx += 4) {
    const [r,g,b,a] = data.data.slice(idx, idx+4)
    const isRed = r > 230 && g < 185 && b < 185
    const isBlack = (r > 80 && r < 125 && g < 120 && b < 120) || (r < 80 && g < 60 && b < 60)
    count += isRed
    data.data.set(isRed || isBlack ? [0, 0, 0] : [255, 255, 255], idx)    
  }
  console.log(count)
  ctx.putImageData(data, 0, 0)
  return loadImage(URL.createObjectURL(await c.convertToBlob()))
}

async function ocr(image) {
  const w = await Tesseract.createWorker('eng', 1, {
    logger: () => {},
  })
  await w.setParameters({
    tessedit_char_whitelist: '0123456789AQJK',
  });
  const { data: { text } } = await w.recognize(image, {}, 'text')
  return text
}

const args = document.body.appendChild(document.createElement('input'))
args.value = "140 360 90 18 -44"
args.value = "870 633 350 25 0"
const results = document.body.appendChild(document.createElement('div'))

async function process(blob) {
  results.innerHTML = ''
  const url = URL.createObjectURL(blob)
  const img0 = await loadImage(url)
  img0.style.maxWidth = "500px"  
  img0.onclick = async e => {
    args.value = [
      e.offsetX * img0.naturalWidth / img0.width, 
      e.offsetY * img0.naturalWidth / img0.width, 
      ...args.value.split(' ').slice(2)
    ].join(' ')
    process2(img0)
  }
  results.append(img0)
  await process2(img0)
}

async function process2(img0) {
  const img1 = await crop(img0, ...args.value.split(' '))
  results.append(img1)
  const debug = results.appendChild(document.createElement('pre'))
  img1.onmousemove = e => {
    const [x, y] = [e.offsetX * img1.naturalWidth / img1.width, e.offsetY * img1.naturalWidth / img1.width]
    const c = new OffscreenCanvas(1, 1)
    const ctx = c.getContext('2d')
    ctx.drawImage(img1, x, y, 1, 1, 0, 0, 1, 1)
    const {data: [r, g, b, a]} = ctx.getImageData(0, 0, 1, 1)
    debug.textContent = [x, y, ":", r, g, b, ':', (255 - r) + g + b, r + g + b].join(' ')
  }
  const img = await recolor(img1)
  //img.style.maxWidth = "500px"
  results.append(img)
  const pre = results.appendChild(document.createElement('pre'))
  pre.textContent = "loading..."
  pre.textContent = await ocr(img)
}


document.onpaste = async e => {
  if (!e.clipboardData.files[0]) return
  process(e.clipboardData.files[0])
}

navigator.permissions.query({name: 'clipboard-read'}).then(x => console.log(x.state))
onload = () => focus()
onfocus = async () => process(await (await navigator.clipboard.read())[0].getType('image/png'))

