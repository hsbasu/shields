import Joi from 'joi'
import { renderDownloadsBadge } from '../downloads.js'
import { nonNegativeInteger } from '../validators.js'
import { BaseJsonService, pathParams } from '../index.js'

const schema = Joi.object({
  downloads: Joi.object({
    total: nonNegativeInteger,
    monthly: nonNegativeInteger,
    weekly: nonNegativeInteger,
    daily: nonNegativeInteger,
  }).required(),
})

const intervalMap = {
  dd: {
    transform: json => json.downloads.daily,
    interval: 'day',
  },
  dw: {
    transform: json => json.downloads.weekly,
    interval: 'week',
  },
  dm: {
    transform: json => json.downloads.monthly,
    interval: 'month',
  },
  dt: {
    transform: json => json.downloads.total,
    interval: '',
  },
}

export default class DubDownloads extends BaseJsonService {
  static category = 'downloads'
  static route = {
    base: 'dub',
    pattern: ':interval(dd|dw|dm|dt)/:packageName/:version*',
  }

  static openApi = {
    '/dub/{interval}/{packageName}': {
      get: {
        summary: 'DUB Downloads',
        parameters: pathParams(
          {
            name: 'interval',
            example: 'dm',
            schema: { type: 'string', enum: this.getEnum('interval') },
          },
          {
            name: 'packageName',
            example: 'vibe-d',
          },
        ),
      },
    },
    '/dub/{interval}/{packageName}/{version}': {
      get: {
        summary: 'DUB Downloads (specific version)',
        parameters: pathParams(
          {
            name: 'interval',
            example: 'dm',
            schema: { type: 'string', enum: this.getEnum('interval') },
          },
          {
            name: 'packageName',
            example: 'vibe-d',
          },
          {
            name: 'version',
            description:
              'This can either be a numeric version like `0.8.4` or the string `latest`',
            example: '0.8.4',
          },
        ),
      },
    },
  }

  static defaultBadgeData = { label: 'downloads' }

  static render({ interval, version, downloads }) {
    return renderDownloadsBadge({
      downloads,
      version,
      interval: intervalMap[interval].interval,
    })
  }

  async fetch({ packageName, version }) {
    let url = `https://code.dlang.org/api/packages/${packageName}`
    if (version) {
      url += `/${version}`
    }
    url += '/stats'
    return this._requestJson({ schema, url })
  }

  async handle({ interval, packageName, version }) {
    const { transform } = intervalMap[interval]

    const json = await this.fetch({ packageName, version })
    const downloads = transform(json)
    return this.constructor.render({ interval, downloads, version })
  }
}
