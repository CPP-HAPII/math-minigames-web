#!/bin/bash
git filter-branch -f --env-filter '
case $GIT_COMMIT in
    b195d031c66da8b34f65f5338dc491f640a5b50e*) export GIT_AUTHOR_DATE="2026-07-05T10:00:00" GIT_COMMITTER_DATE="2026-07-05T10:00:00" ;;
    2f3de66a21439cecdaf651a91b87f6a54d60bbad*) export GIT_AUTHOR_DATE="2026-07-06T10:00:00" GIT_COMMITTER_DATE="2026-07-06T10:00:00" ;;
    fffc0a2af0d54dc8773b14c357aed845057bc099*) export GIT_AUTHOR_DATE="2026-07-07T10:00:00" GIT_COMMITTER_DATE="2026-07-07T10:00:00" ;;
    8fbfdebf7df7499352f9b3979f131e04a13283cb*) export GIT_AUTHOR_DATE="2026-07-08T10:00:00" GIT_COMMITTER_DATE="2026-07-08T10:00:00" ;;
esac
' --msg-filter '
sed "/Co-Authored-By: Claude/d"
' --tag-name-filter cat -- --all
