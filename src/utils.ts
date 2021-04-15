export const toRelativeTime = (timeString: string): string => {
  const time = getTime(timeString)
  const min = 60 * 1000
  const hr = min * 60
  const day = hr * 24
  const month = day * 30
  const year = day * 365
  const diff = Date.now() - time

  if (diff < min) return Math.round(diff / 1000) + ' seconds ago'
  else if (diff < hr) return Math.round(diff / min) + ' minutes ago'
  else if (diff < day) return Math.round(diff / hr) + ' hours ago'
  else if (diff < month) return Math.round(diff / day) + ' days ago'
  else if (diff < year) return Math.round(diff / month) + ' months ago'
  else return Math.round(diff / year) + ' years ago'
}

export const toDDMMYYYY = (timeString: string): string => {
  const time = getTime(timeString)
  const date = new Date(time)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = date.getDate()
  const monthIndex = date.getMonth()
  const month = months[monthIndex]
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

const getTime = (timeString: string) => new Date(timeString).getTime()

export const toStandardTime = (timeString: string): string =>
  `${toRelativeTime(timeString)} (${toDDMMYYYY(timeString)})`

export const capFirst = (string: string): string => string.charAt(0).toUpperCase() + string.slice(1)

export const getUrlLastSegmant = () =>
  location.href.substring(location.href.lastIndexOf('/') + 1).replaceAll('%20', ' ')

export const toPreciseTime = (timeString: string): string => {
  const date = new Date(timeString)
  const DD = ('0' + date.getDate()).slice(-2)
  const MM = ('0' + (date.getMonth() + 1)).slice(-2)
  const YYYY = date.getFullYear()
  const HH = date.getHours()
  const mm = date.getMinutes()
  const ss = date.getSeconds()
  return YYYY + '-' + MM + '-' + DD + ' ' + HH + ':' + mm + ':' + ss
}

export const uuidv4 = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
