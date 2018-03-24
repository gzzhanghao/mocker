# Mocker
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fgzzhanghao%2Fmocker.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fgzzhanghao%2Fmocker?ref=badge_shield)


Yet another debugging proxy.

__Key features__

- Hijacking HTTP(s) requests with node.js
- Full-featured routing
- Various upstream type

## Getting started

Install mocker with following command:

```bash
npm i -g @gzzhanghao/mocker
```

Check out the [Getting Started tutorial](https://github.com/gzzhanghao/mocker/wiki/Getting-started) for a quick Getting Started guide.

Or check out the [Documentation](https://github.com/gzzhanghao/mocker/wiki/Documentation) for detailed usage.

Further, check out the [mocker-utils package](https://github.com/gzzhanghao/mocker-utils), which packed a set of utility functions. It is really helpful when building a large mockup script project.

## Development

Mocker is written in ES2015, so make sure your node.js supports ES0215 features such as generator.

__Setup__

```bash
git clone https://github.com/gzzhanghao/mocker.git
cd mocker && npm i
```

Then you can either build mocker once:

```bash
npm run build
```

or let mocker build incrementally when files changed:

```bash
npm run watch
```

__Tests__

Tests are missing, it'll be great if you can bring it to us. :P


## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fgzzhanghao%2Fmocker.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fgzzhanghao%2Fmocker?ref=badge_large)