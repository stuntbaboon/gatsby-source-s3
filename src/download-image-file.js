import { createRemoteFileNode } from 'gatsby-source-filesystem';

export async function downloadImageFile(
  node,
  { store, cache, httpHeaders, createNode, createNodeId, touchNode }
) {
  const clone = Object.assign({}, node);
  let imageNodeId;
  const cacheKey = clone.id;

  const cacheData = await cache.get(cacheKey);

  if (cacheData && clone.LastModified === cacheData.LastModified) {
    imageNodeId = cacheData.imageNodeId;
    touchNode(cacheData.imageNodeId);
  }

  if (!imageNodeId) {
    try {
      const imageNode = await createRemoteFileNode({
        url: clone.Url,
        parentNodeId: clone.id,
        store,
        cache,
        createNode,
        createNodeId,
        httpHeaders,
      });

      if (imageNode) {
        imageNodeId = imageNode.id;

        await cache.set(cacheKey, {
          imageNodeId,
          LastModified: clone.LastModified,
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (imageNodeId) {
    clone.localFile___NODE = imageNodeId;
  }

  return clone;
}
