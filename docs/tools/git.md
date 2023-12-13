# GIT

### 1.当前分支代码保存到另一分支
1. 当前分支暂存修改
```git
git stash save '1111'
```
2. 切换分支
```
git checkout -b feature/c3
git stash pop
```
3. 回到主分支
```
git checkout master
```

