import crypto from 'crypto';

import { listObjects } from './list-objects';
import { schema } from './plugin-options';
import { downloadImageFile } from './download-image-file';

const createContentDigest = obj =>
  crypto
    .createHash('md5')
    .update(JSON.stringify(obj))
    .digest('hex');

const isImage = object => /\.(jpe?g|png|webp|tiff?)$/i.test(object);

export async function sourceNodes(
  { boundActionCreators, createNodeId, store, cache },
  pluginOptions
) {
  const { createNode, touchNode } = boundActionCreators;

  const {
    aws: awsConfig,
    buckets: bucketsConfig,
    headers: httpHeaders,
  } = await schema.validate(pluginOptions);

  const buckets = await listObjects(bucketsConfig, awsConfig);

  await Promise.all(
    buckets.map(({ Contents, ...rest }) => {
      return Promise.all(
        Contents.map(async content => {
          const { Key } = content;
          const node = {
            ...rest,
            ...content,
            Url: `https://s3-${awsConfig.region}.amazonaws.com/${
              rest.Name
            }/${Key}`,
            id: `s3-${Key}`,
            children: [],
            parent: '__SOURCE__',
            internal: {
              type: 'S3Object',
              contentDigest: createContentDigest(content),
              content: JSON.stringify(content),
            },
          };

          createNode(node);

          if (isImage(Key)) {
            const Extension = Key.split('.').pop();
            const imageNode = await downloadImageFile(
              {
                ...node,
                Extension,
                id: `s3-image-${Key}`,
                internal: {
                  type: 'S3Image',
                  contentDigest: createContentDigest(content),
                  content: JSON.stringify(content),
                },
              },
              {
                store,
                cache,
                httpHeaders,
                createNode,
                createNodeId,
                touchNode,
              }
            );
            createNode(imageNode);
          }
        })
      );
    })
  );

  return buckets;
}
