	.build_version macos, 26, 5	sdk_version 26, 5
	.section	__TEXT,__text,regular,pure_instructions
	.globl	_numeric_main                   ; -- Begin function numeric_main
	.p2align	2
_numeric_main:                          ; @numeric_main
	.cfi_startproc
; %bb.0:
	fadd	d0, d0, d0
	ret
	.cfi_endproc
                                        ; -- End function
.subsections_via_symbols
